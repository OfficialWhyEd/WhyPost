"""
WhyPost Memory Engine — sistema di auto-apprendimento esponenziale.

Ogni agente chiama check_before_action() prima di agire.
Ogni errore viene ricordato. Ogni correzione dell'utente diventa legge.
Il peso degli errori cresce esponenzialmente: stesso errore 3x → blocco automatico.
"""

import json
import logging
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional

BASE = Path(__file__).parent.parent
LEARNING_DB = BASE / "data" / "learning.db"
logger = logging.getLogger(__name__)

# ─── Soglie ───────────────────────────────────────────────────────────────────
BLOCK_THRESHOLD   = 3.0   # peso minimo per bloccare un'azione
WEIGHT_BASE       = 1.0   # peso iniziale di ogni errore
WEIGHT_MULTIPLIER = 1.8   # moltiplicatore esponenziale per ogni occorrenza
SUCCESS_DISCOUNT  = 0.4   # quanto scende il peso dopo un successo


# ─── Init DB ──────────────────────────────────────────────────────────────────
def init_learning_db():
    with sqlite3.connect(LEARNING_DB) as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS error_patterns (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                agent           TEXT NOT NULL,
                pattern_key     TEXT NOT NULL,
                description     TEXT NOT NULL,
                lesson          TEXT NOT NULL,
                occurrences     INTEGER DEFAULT 1,
                weight          REAL DEFAULT 1.0,
                last_seen       TEXT,
                created_at      TEXT DEFAULT (datetime('now')),
                UNIQUE(agent, pattern_key)
            );

            CREATE TABLE IF NOT EXISTS corrections (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                agent           TEXT,
                correction_text TEXT NOT NULL,
                context_json    TEXT,
                source          TEXT DEFAULT 'user',
                applied_count   INTEGER DEFAULT 0,
                created_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS video_outcomes (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id        TEXT UNIQUE NOT NULL,
                template        TEXT,
                topic           TEXT,
                language        TEXT,
                hook_style      TEXT,
                duration_est    INTEGER,
                platform        TEXT,
                views           INTEGER DEFAULT 0,
                likes           INTEGER DEFAULT 0,
                comments        INTEGER DEFAULT 0,
                shares          INTEGER DEFAULT 0,
                outcome_score   REAL DEFAULT 0.0,
                recorded_at     TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS lessons (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                agent           TEXT,
                lesson_type     TEXT NOT NULL,
                lesson_text     TEXT NOT NULL,
                context_json    TEXT,
                importance      REAL DEFAULT 1.0,
                times_used      INTEGER DEFAULT 0,
                created_at      TEXT DEFAULT (datetime('now'))
            );
        """)


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(LEARNING_DB)
    conn.row_factory = sqlite3.Row
    return conn


# ─── Core: remember_error ─────────────────────────────────────────────────────
def remember_error(agent: str, pattern_key: str, description: str, lesson: str):
    """
    Registra un errore. Ogni volta che lo stesso errore si ripete,
    il peso cresce esponenzialmente. Oltre BLOCK_THRESHOLD → blocco automatico.
    """
    with _conn() as conn:
        row = conn.execute(
            "SELECT id, occurrences, weight FROM error_patterns WHERE agent=? AND pattern_key=?",
            (agent, pattern_key)
        ).fetchone()

        now = datetime.now().isoformat()

        if row:
            new_occurrences = row["occurrences"] + 1
            new_weight = WEIGHT_BASE * (WEIGHT_MULTIPLIER ** new_occurrences)
            conn.execute(
                "UPDATE error_patterns SET occurrences=?, weight=?, last_seen=?, description=?, lesson=? WHERE id=?",
                (new_occurrences, new_weight, now, description, lesson, row["id"])
            )
            logger.warning(
                f"[MEMORY] Errore ripetuto ({new_occurrences}x) — {agent}:{pattern_key} — peso: {new_weight:.2f}"
                + (" — BLOCCO ATTIVO" if new_weight >= BLOCK_THRESHOLD else "")
            )
        else:
            conn.execute(
                "INSERT INTO error_patterns (agent, pattern_key, description, lesson, occurrences, weight, last_seen) "
                "VALUES (?,?,?,?,1,?,?)",
                (agent, pattern_key, description, lesson, WEIGHT_BASE, now)
            )
            logger.info(f"[MEMORY] Nuovo errore registrato — {agent}:{pattern_key}")


# ─── Core: remember_success ───────────────────────────────────────────────────
def remember_success(agent: str, pattern_key: str):
    """
    Dopo un successo, riduce il peso dell'errore corrispondente.
    Il sistema impara che l'ha superato.
    """
    with _conn() as conn:
        row = conn.execute(
            "SELECT id, weight, occurrences FROM error_patterns WHERE agent=? AND pattern_key=?",
            (agent, pattern_key)
        ).fetchone()
        if row:
            new_weight = max(0.0, row["weight"] - SUCCESS_DISCOUNT)
            conn.execute(
                "UPDATE error_patterns SET weight=?, last_seen=? WHERE id=?",
                (new_weight, datetime.now().isoformat(), row["id"])
            )
            logger.info(f"[MEMORY] Successo registrato — {agent}:{pattern_key} — peso sceso a {new_weight:.2f}")


# ─── Core: check_before_action ────────────────────────────────────────────────
def check_before_action(agent: str, action_type: str, context: dict = None) -> tuple[bool, str, str]:
    """
    Pre-flight check. Chiama PRIMA di ogni azione significativa.
    Ritorna: (blocked: bool, reason: str, lesson: str)

    Se blocked=True → l'agente NON deve procedere.
    """
    with _conn() as conn:
        # Cerca pattern che matchano questo agente e action_type
        rows = conn.execute(
            "SELECT * FROM error_patterns WHERE agent IN (?, 'ALL') AND pattern_key LIKE ? AND weight >= ?",
            (agent, f"%{action_type}%", BLOCK_THRESHOLD)
        ).fetchall()

        if rows:
            # Prendi il più grave
            worst = max(rows, key=lambda r: r["weight"])
            logger.warning(
                f"[MEMORY BLOCK] {agent}:{action_type} bloccato — "
                f"occorrenze: {worst['occurrences']} — peso: {worst['weight']:.2f}\n"
                f"Motivo: {worst['description']}\nLezione: {worst['lesson']}"
            )
            return True, worst["description"], worst["lesson"]

        # Controlla anche le correzioni utente rilevanti
        corrections = conn.execute(
            "SELECT * FROM corrections WHERE agent IN (?, 'ALL') ORDER BY created_at DESC LIMIT 10",
            (agent,)
        ).fetchall()

        if corrections and context:
            context_str = json.dumps(context, ensure_ascii=False).lower()
            for c in corrections:
                keywords = _extract_keywords(c["correction_text"])
                if any(k in context_str for k in keywords):
                    logger.warning(
                        f"[MEMORY] Correzione utente rilevante per {agent}:{action_type}: {c['correction_text'][:80]}"
                    )
                    # Le correzioni non bloccano, ma avvisano e incrementano applied_count
                    conn.execute(
                        "UPDATE corrections SET applied_count=applied_count+1 WHERE id=?", (c["id"],)
                    )
                    return False, "", c["correction_text"]

    return False, "", ""


# ─── Core: remember_correction ────────────────────────────────────────────────
def remember_correction(correction_text: str, agent: str = "ALL", context: dict = None):
    """
    Salva una correzione dell'utente come legge permanente.
    Viene richiamata ogni volta che l'utente corregge qualcosa dalla CHAT-AI.
    """
    with _conn() as conn:
        conn.execute(
            "INSERT INTO corrections (agent, correction_text, context_json, source) VALUES (?,?,?,?)",
            (agent, correction_text.strip(), json.dumps(context or {}), "user")
        )
    logger.info(f"[MEMORY] Correzione utente salvata per {agent}: {correction_text[:80]}")

    # Controlla se questa correzione descrive un errore ripetuto
    lower = correction_text.lower()
    if any(w in lower for w in ["non fare", "stop", "sbagliato", "errore", "non usare", "evita", "mai più", "wrong", "never"]):
        pattern_key = f"user_correction_{hash(correction_text) % 10000}"
        remember_error(agent, pattern_key, correction_text, f"L'utente ha corretto: {correction_text}")


# ─── Core: learn_from_video ───────────────────────────────────────────────────
def learn_from_video(video_id: str, template: str, topic: str, language: str,
                     hook_style: str, duration_est: int, platform: str,
                     views: int, likes: int, comments: int, shares: int):
    """
    Registra il risultato di un video pubblicato.
    Calcola outcome_score e impara dai pattern di successo/fallimento.
    """
    # Score semplice: normalizzato su views con bonus engagement
    if views > 0:
        engagement_rate = (likes + comments * 2 + shares * 3) / views
        outcome_score = min(10.0, views / 100 + engagement_rate * 20)
    else:
        outcome_score = 0.0

    with _conn() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO video_outcomes
            (video_id, template, topic, language, hook_style, duration_est,
             platform, views, likes, comments, shares, outcome_score)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (video_id, template, topic, language, hook_style, duration_est,
              platform, views, likes, comments, shares, outcome_score))

    # Impara dai flop (score < 1.0)
    if outcome_score < 1.0:
        remember_error(
            "SCRIPT",
            f"low_perf_{template}_{topic[:20]}",
            f"Video '{video_id}' ha performato male (score {outcome_score:.1f}): template={template}, topic={topic}",
            f"Evita di combinare template '{template}' con topic '{topic}' — ha generato scarso engagement"
        )
    # Impara dai successi (score > 5.0)
    elif outcome_score > 5.0:
        remember_success("SCRIPT", f"low_perf_{template}_{topic[:20]}")
        _save_lesson(
            "SCRIPT", "success_pattern",
            f"Combinazione vincente: template={template}, topic={topic}, hook_style={hook_style}, score={outcome_score:.1f}",
            context={"template": template, "topic": topic, "hook_style": hook_style},
            importance=outcome_score / 10
        )

    logger.info(f"[MEMORY] Video {video_id} outcome score: {outcome_score:.2f}")
    return outcome_score


# ─── Core: get_lessons_for ────────────────────────────────────────────────────
def get_lessons_for(agent: str, limit: int = 10) -> list[dict]:
    """
    Ritorna le lezioni più importanti per un agente.
    Usato dallo script writer per contestualizzare la generazione.
    """
    with _conn() as conn:
        # Top successi
        successes = conn.execute("""
            SELECT lesson_text, importance FROM lessons
            WHERE agent IN (?, 'ALL') AND lesson_type = 'success_pattern'
            ORDER BY importance DESC LIMIT ?
        """, (agent, limit // 2)).fetchall()

        # Errori attivi (non ancora in blocco ma da tenere a mente)
        warnings = conn.execute("""
            SELECT description, lesson, weight FROM error_patterns
            WHERE agent IN (?, 'ALL') AND weight > 0.5 AND weight < ?
            ORDER BY weight DESC LIMIT ?
        """, (agent, BLOCK_THRESHOLD, limit // 2)).fetchall()

        # Correzioni utente
        corrections = conn.execute("""
            SELECT correction_text FROM corrections
            WHERE agent IN (?, 'ALL')
            ORDER BY created_at DESC LIMIT ?
        """, (agent, 5)).fetchall()

    result = []
    for s in successes:
        result.append({"type": "success", "text": s["lesson_text"], "weight": s["importance"]})
    for w in warnings:
        result.append({"type": "warning", "text": w["lesson"], "weight": w["weight"]})
    for c in corrections:
        result.append({"type": "correction", "text": c["correction_text"], "weight": 2.0})

    return sorted(result, key=lambda x: x["weight"], reverse=True)


# ─── Core: get_memory_summary ─────────────────────────────────────────────────
def get_memory_summary() -> dict:
    """
    Snapshot completo dello stato della memoria.
    Usato dalla CHAT-AI per rispondere a "cosa hai imparato?"
    """
    with _conn() as conn:
        total_errors = conn.execute("SELECT COUNT(*) FROM error_patterns").fetchone()[0]
        blocked = conn.execute(
            "SELECT COUNT(*) FROM error_patterns WHERE weight >= ?", (BLOCK_THRESHOLD,)
        ).fetchone()[0]
        corrections = conn.execute("SELECT COUNT(*) FROM corrections").fetchone()[0]
        videos_analyzed = conn.execute("SELECT COUNT(*) FROM video_outcomes").fetchone()[0]
        best_score = conn.execute("SELECT MAX(outcome_score) FROM video_outcomes").fetchone()[0] or 0
        worst_patterns = conn.execute(
            "SELECT agent, pattern_key, description, occurrences, weight FROM error_patterns "
            "WHERE weight >= ? ORDER BY weight DESC LIMIT 5", (BLOCK_THRESHOLD,)
        ).fetchall()

    return {
        "total_errors_learned": total_errors,
        "active_blocks": blocked,
        "user_corrections": corrections,
        "videos_analyzed": videos_analyzed,
        "best_video_score": round(best_score, 2),
        "top_blocked_patterns": [
            {
                "agent": r["agent"],
                "pattern": r["pattern_key"],
                "description": r["description"][:80],
                "occurrences": r["occurrences"],
                "weight": round(r["weight"], 2)
            } for r in worst_patterns
        ]
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _save_lesson(agent: str, lesson_type: str, lesson_text: str,
                 context: dict = None, importance: float = 1.0):
    with _conn() as conn:
        conn.execute(
            "INSERT INTO lessons (agent, lesson_type, lesson_text, context_json, importance) VALUES (?,?,?,?,?)",
            (agent, lesson_type, lesson_text, json.dumps(context or {}), importance)
        )


def _extract_keywords(text: str) -> list[str]:
    """Estrae keyword significative da una correzione per il matching."""
    stopwords = {"il", "la", "lo", "di", "da", "in", "non", "che", "e", "a",
                 "the", "a", "an", "is", "not", "and", "or", "to", "of"}
    words = [w.strip(".,!?;:").lower() for w in text.split() if len(w) > 3]
    return [w for w in words if w not in stopwords][:8]


# ─── CLI ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [MEMORY] %(message)s")

    init_learning_db()

    cmd = sys.argv[1] if len(sys.argv) > 1 else "summary"

    if cmd == "summary":
        summary = get_memory_summary()
        print(json.dumps(summary, indent=2, ensure_ascii=False))

    elif cmd == "lessons":
        agent = sys.argv[2] if len(sys.argv) > 2 else "SCRIPT"
        lessons = get_lessons_for(agent)
        for l in lessons:
            print(f"[{l['type'].upper()}] (w={l['weight']:.2f}) {l['text'][:100]}")

    elif cmd == "correct":
        # Uso: python -m agents.memory correct "AGENT" "testo correzione"
        agent = sys.argv[2] if len(sys.argv) > 2 else "ALL"
        text = sys.argv[3] if len(sys.argv) > 3 else ""
        if text:
            remember_correction(text, agent)
            print(f"Correzione salvata per {agent}: {text}")
        else:
            print("Uso: python -m agents.memory correct AGENT 'testo'")

    elif cmd == "init":
        print("Learning DB inizializzato")

    else:
        print(f"Comandi: summary | lessons [AGENT] | correct AGENT 'testo' | init")
