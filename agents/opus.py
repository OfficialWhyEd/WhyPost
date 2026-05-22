# agents/opus.py — Weekly review con Claude Opus: analytics reali + raccomandazioni concrete
import json
import logging
import re
import sqlite3
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

from agents.memory import get_lessons_for, remember_correction

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)


def _collect_week_stats() -> dict:
    """Raccoglie statistiche della settimana scorsa dalla learning.db e queue.json."""
    stats = {
        "videos_published": 0,
        "videos_failed": 0,
        "total_views": 0,
        "total_likes": 0,
        "top_performer": None,
        "worst_performer": None,
        "top_performers": [],
        "worst_performers": [],
        "failed_videos": [],
        "error_patterns": [],
        "topics_stats": {},
        "lessons": [],
        "avg_views": 0,
        "buffer_count": 0,
        "date_range": "",
    }

    week_ago = datetime.now() - timedelta(days=7)
    date_start = week_ago.strftime("%d/%m")
    date_end = datetime.now().strftime("%d/%m/%Y")
    stats["date_range"] = f"{date_start} – {date_end}"

    # ─── Da queue.json: video pubblicati e falliti ───────────────────────────
    try:
        queue = json.loads((BASE / "queue.json").read_text())
        videos = queue.get("videos", [])

        published = []
        for v in videos:
            if v.get("status") == "published" and v.get("published_at"):
                try:
                    pub_dt = datetime.fromisoformat(v["published_at"])
                    if pub_dt >= week_ago:
                        published.append(v)
                except ValueError:
                    pass

        failed = [v for v in videos if v.get("status") == "needs_fix"]
        stats["videos_published"] = len(published)
        stats["videos_failed"] = len(failed)
        stats["failed_videos"] = [
            {"id": v["id"], "title": v.get("idea_title", v.get("title", v["id"])),
             "reason": v.get("fail_reason", "motivo sconosciuto")}
            for v in failed[:5]
        ]

        # Buffer attuale (video ready/rendered)
        stats["buffer_count"] = sum(1 for v in videos if v.get("status") in ("ready", "rendered"))

        # Metriche e top/worst performers
        with_metrics = [v for v in published if v.get("metrics")]
        if with_metrics:
            def _views(v):
                m = v.get("metrics", {})
                return m.get("impressions", m.get("views", 0))

            def _likes(v):
                m = v.get("metrics", {})
                return m.get("likes", 0)

            sorted_v = sorted(with_metrics, key=_views, reverse=True)
            stats["total_views"] = sum(_views(v) for v in with_metrics)
            stats["total_likes"] = sum(_likes(v) for v in with_metrics)
            stats["avg_views"] = stats["total_views"] // len(with_metrics)

            stats["top_performers"] = [
                {"id": v["id"],
                 "title": v.get("idea_title", v.get("title", v["id"])),
                 "views": _views(v),
                 "likes": _likes(v)}
                for v in sorted_v[:3]
            ]
            stats["worst_performers"] = [
                {"id": v["id"],
                 "title": v.get("idea_title", v.get("title", v["id"])),
                 "views": _views(v),
                 "likes": _likes(v)}
                for v in sorted_v[-3:]
            ]
            if sorted_v:
                best = sorted_v[0]
                stats["top_performer"] = {
                    "title": best.get("idea_title", best.get("title", best["id"])),
                    "views": _views(best),
                    "likes": _likes(best),
                }
                worst = sorted_v[-1]
                stats["worst_performer"] = {
                    "title": worst.get("idea_title", worst.get("title", worst["id"])),
                    "views": _views(worst),
                    "likes": _likes(worst),
                }

        # Topics stats: views per topic
        for v in with_metrics:
            topic = v.get("topic", v.get("video_type", "sconosciuto"))
            if topic not in stats["topics_stats"]:
                stats["topics_stats"][topic] = {"count": 0, "total_views": 0, "total_likes": 0}
            stats["topics_stats"][topic]["count"] += 1
            stats["topics_stats"][topic]["total_views"] += _views(v) if with_metrics else 0
            stats["topics_stats"][topic]["total_likes"] += _likes(v) if with_metrics else 0

    except Exception as e:
        logger.warning(f"[OPUS] queue stats: {e}")

    # ─── Da learning.db: errori + lezioni ────────────────────────────────────
    db_path = BASE / "data" / "learning.db"
    if db_path.exists():
        try:
            con = sqlite3.connect(str(db_path))
            cur = con.cursor()
            week_ago_str = week_ago.isoformat()

            # Errori ricorrenti (tabella error_patterns)
            try:
                cur.execute(
                    "SELECT description, occurrences, weight FROM error_patterns "
                    "WHERE last_seen > ? ORDER BY weight DESC LIMIT 5",
                    (week_ago_str,)
                )
                rows = cur.fetchall()
                stats["error_patterns"] = [
                    {"description": r[0][:100], "occurrences": r[1], "weight": round(r[2], 2)}
                    for r in rows
                ]
            except Exception:
                pass

            # Errori da tabella errors (se esiste)
            try:
                cur.execute(
                    "SELECT action, error_type, COUNT(*) as cnt FROM errors "
                    "WHERE created_at > ? GROUP BY action, error_type ORDER BY cnt DESC LIMIT 5",
                    (week_ago_str,)
                )
                rows = cur.fetchall()
                stats["error_patterns"] += [
                    {"action": r[0], "type": r[1], "count": r[2]} for r in rows
                ]
            except Exception:
                pass

            con.close()
        except Exception as e:
            logger.warning(f"[OPUS] learning.db: {e}")

    # ─── Lezioni da memory ────────────────────────────────────────────────────
    try:
        lessons = get_lessons_for("ALL", limit=8)
        stats["lessons"] = lessons
    except Exception as e:
        logger.warning(f"[OPUS] lessons: {e}")

    return stats


def _build_review_prompt(stats: dict) -> str:
    """Costruisce il prompt strutturato per Opus."""
    date_range = stats.get("date_range", "ultimi 7 giorni")

    # Top / worst performer
    top_str = "nessuno"
    if stats.get("top_performer"):
        t = stats["top_performer"]
        top_str = f'"{t["title"]}" — {t["views"]} views, {t["likes"]} likes'

    worst_str = "nessuno"
    if stats.get("worst_performer"):
        w = stats["worst_performer"]
        worst_str = f'"{w["title"]}" — {w["views"]} views, {w["likes"]} likes'

    # Buffer
    buffer_str = f"{stats['buffer_count']}/7 giorni"

    # Errori ricorrenti
    if stats["error_patterns"]:
        errors_lines = []
        for e in stats["error_patterns"]:
            if "description" in e:
                errors_lines.append(f"- {e['description']} (occorrenze: {e.get('occurrences', '?')}, peso: {e.get('weight', '?')})")
            elif "action" in e:
                errors_lines.append(f"- {e['action']} / {e.get('type', '?')}: {e.get('count', '?')}x")
        errors_str = "\n".join(errors_lines) if errors_lines else "nessuno"
    else:
        errors_str = "nessuno"

    # Topics con performance
    topics_lines = []
    for topic, data in sorted(stats["topics_stats"].items(), key=lambda x: x[1]["total_views"], reverse=True):
        avg = data["total_views"] // data["count"] if data["count"] else 0
        topics_lines.append(f"- {topic}: {data['count']} video, {data['total_views']} views totali (media: {avg})")
    topics_str = "\n".join(topics_lines) if topics_lines else "dati insufficienti"

    # Lezioni attive
    lessons_lines = []
    for lesson in stats.get("lessons", []):
        tag = lesson.get("type", "info").upper()
        lessons_lines.append(f"- [{tag}] {lesson.get('text', '')[:120]}")
    lessons_str = "\n".join(lessons_lines) if lessons_lines else "nessuna lezione registrata"

    # Video falliti
    failed_lines = []
    for v in stats.get("failed_videos", []):
        failed_lines.append(f"- {v['title']}: {v['reason']}")
    failed_str = "\n".join(failed_lines) if failed_lines else "nessuno"

    prompt = f"""Sei il weekly reviewer di WhyPost, un sistema di content automation per TikTok e Instagram.
Analizza i dati della settimana e produci raccomandazioni concrete.

## Dati settimana [{date_range}]
Videos pubblicati: {stats['videos_published']}
Videos falliti (needs_fix): {stats['videos_failed']}
Views totali: {stats['total_views']}
Likes totali: {stats['total_likes']}
Views medie: {stats['avg_views']}
Top performer: {top_str}
Worst performer: {worst_str}
Buffer attuale: {buffer_str}

## Video falliti
{failed_str}

## Errori ricorrenti
{errors_str}

## Topics usati (con performance)
{topics_str}

## Lezioni attive nel sistema
{lessons_str}

Produci:
1. ANALISI (3 punti max): cosa ha funzionato e perché
2. PROBLEMI (max 2): cosa non ha funzionato
3. AZIONI (3 azioni concrete per la prossima settimana): cambiamenti specifici a topics, template, timing
4. REGOLA NUOVA (1 max): una regola da aggiungere al sistema se c'è un pattern chiaro

Rispondi in italiano. Sii specifico e operativo, non generico.
"""
    return prompt


def _call_opus_headless(prompt: str) -> str:
    """Chiama Claude Opus in modalità headless e ritorna la risposta."""
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", "claude-opus-4-5"],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(BASE),
        )
        if result.returncode == 0:
            return result.stdout.strip()
        logger.error(f"[OPUS] subprocess error (rc={result.returncode}): {result.stderr[:300]}")
        return ""
    except subprocess.TimeoutExpired:
        logger.error("[OPUS] Timeout dopo 300s")
        return ""
    except FileNotFoundError:
        logger.error("[OPUS] Comando 'claude' non trovato nel PATH")
        return ""
    except Exception as e:
        logger.error(f"[OPUS] Errore chiamata headless: {e}")
        return ""


def _extract_new_rule(response: str) -> str:
    """Estrae la REGOLA NUOVA dalla risposta di Opus, se presente."""
    patterns = [
        r"REGOLA NUOVA[:\s*]+(.+?)(?:\n\n|\Z)",
        r"##\s*REGOLA NUOVA[:\s*]+(.+?)(?:\n#|\Z)",
        r"\*\*REGOLA NUOVA\*\*[:\s*]+(.+?)(?:\n\n|\Z)",
    ]
    for pat in patterns:
        match = re.search(pat, response, re.IGNORECASE | re.DOTALL)
        if match:
            rule = match.group(1).strip()
            # Prendi solo la prima riga se è un blocco lungo
            first_line = rule.split("\n")[0].strip(" -*:")
            if len(first_line) > 10:
                return first_line
    return ""


def update_state(status: str, extra: dict = None):
    """Aggiorna state.json con lo stato dell'agente OPUS."""
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("OPUS", {})
    state["agents"]["OPUS"].update({
        "status": status,
        "last_run": datetime.now().isoformat(),
    })
    if extra:
        state["agents"]["OPUS"].update(extra)
    state["updated_at"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def run_weekly_review():
    """Esegue la weekly review con Claude Opus e salva il report."""
    logger.info("[OPUS] ═══ Weekly Review avviata ═══")
    update_state("running")

    # 1. Raccolta dati
    logger.info("[OPUS] Raccolta dati settimana...")
    stats = _collect_week_stats()
    logger.info(
        f"[OPUS] Dati: {stats['videos_published']} pubblicati, "
        f"{stats['total_views']} views totali, "
        f"avg: {stats['avg_views']}, "
        f"buffer: {stats['buffer_count']}/7"
    )

    # 2. Build prompt
    prompt = _build_review_prompt(stats)

    # 3. Chiama Opus headless
    logger.info("[OPUS] Chiamata a Claude Opus headless (timeout 300s)...")
    response = _call_opus_headless(prompt)

    if not response:
        logger.error("[OPUS] Nessuna risposta da Claude Opus")
        update_state("error", {"last_error": "nessuna risposta da Claude Opus"})
        return

    logger.info(f"[OPUS] Risposta ricevuta ({len(response)} chars)")

    # 4. Salva report in data/weekly_reviews/YYYY-MM-DD.md
    review_dir = BASE / "data" / "weekly_reviews"
    review_dir.mkdir(parents=True, exist_ok=True)
    today_str = datetime.now().strftime("%Y-%m-%d")
    report_path = review_dir / f"{today_str}.md"

    report_content = (
        f"# Weekly Review WhyPost — {today_str}\n\n"
        f"**Periodo**: {stats['date_range']}\n"
        f"**Video pubblicati**: {stats['videos_published']} "
        f"| **Views totali**: {stats['total_views']} "
        f"| **Likes totali**: {stats['total_likes']} "
        f"| **Views medie**: {stats['avg_views']}\n"
        f"**Buffer**: {stats['buffer_count']}/7 giorni\n\n"
        f"---\n\n"
        f"{response}\n"
    )
    report_path.write_text(report_content, encoding="utf-8")
    logger.info(f"[OPUS] Report salvato → {report_path}")

    # 5. Estrai REGOLA NUOVA e salvala in memory
    new_rule = _extract_new_rule(response)
    if new_rule:
        logger.info(f"[OPUS] Nuova regola estratta: {new_rule[:80]}")
        try:
            remember_correction(new_rule, agent="ALL", context={"source": "opus_weekly_review", "date": today_str})
            logger.info("[OPUS] Regola salvata in learning.db")
        except Exception as e:
            logger.warning(f"[OPUS] Errore salvataggio regola: {e}")

    # 6. Aggiorna state.json
    update_state("idle", {
        "last_weekly_review": today_str,
        "last_review_summary": response[:500],
    })

    logger.info("[OPUS] ═══ Weekly Review completata ═══")
    return report_path


# Alias per compatibilità con crontab che chiama run()
def run():
    return run_weekly_review()


if __name__ == "__main__":
    from agents.logsetup import setup_logging
    setup_logging("opus")
    run_weekly_review()
