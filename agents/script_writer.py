# ~/Documents/WhyPost/agents/script_writer.py
import json
import logging
import sqlite3
import yaml
import subprocess
import time
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

def load_config():
    return yaml.safe_load((BASE / "config.yaml").read_text())

def ask_claude(prompt: str, model: str = "sonnet") -> str:
    backoff = [0, 30, 60, 300]
    for wait in backoff:
        if wait:
            logger.warning(f"Attendo {wait}s per rate limit...")
            time.sleep(wait)
        try:
            result = subprocess.run(
                ["claude", "-p", prompt, "--model", model],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode == 0:
                return result.stdout.strip()
            if "rate limit" in result.stderr.lower():
                continue
            logger.error(f"Claude stderr: {result.stderr[:200]}")
            return ""
        except subprocess.TimeoutExpired:
            logger.error("Claude timeout (120s)")
            return ""
    return ""

def get_ideas_conn():
    conn = sqlite3.connect(BASE / "data" / "ideas.db")
    conn.row_factory = sqlite3.Row
    return conn

def pick_idea(topic: str = None) -> dict | None:
    with get_ideas_conn() as conn:
        if topic:
            row = conn.execute(
                "SELECT * FROM ideas WHERE status='raw' AND (topic LIKE ? OR title LIKE ?) ORDER BY created_at ASC LIMIT 1",
                (f"%{topic}%", f"%{topic}%")
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM ideas WHERE status='raw' ORDER BY created_at ASC LIMIT 1"
            ).fetchone()
        return dict(row) if row else None

def mark_idea_used(idea_id: int):
    with get_ideas_conn() as conn:
        conn.execute(
            "UPDATE ideas SET status='used', used_at=? WHERE id=?",
            (datetime.now().isoformat(), idea_id)
        )

def build_memory_context(idea: dict) -> str:
    """Inietta lezioni passate nel prompt — il sistema ricorda cosa ha imparato."""
    try:
        from agents.memory import get_lessons_for
        lessons = get_lessons_for("SCRIPT", limit=8)
        if not lessons:
            return ""
        lines = ["\n\n---\nMEMORIA SISTEMA (lezioni da video precedenti — rispettale):"]
        for l in lessons:
            prefix = {"success": "FUNZIONA BENE", "warning": "ATTENZIONE", "correction": "CORREZIONE UTENTE"}
            lines.append(f"- [{prefix.get(l['type'], l['type'].upper())}] {l['text'][:120]}")
        return "\n".join(lines)
    except Exception:
        return ""

def write_script(idea: dict, language: str, video_type: str) -> dict | None:
    from agents.memory import check_before_action, remember_error, remember_success, init_learning_db
    init_learning_db()

    # Pre-flight: blocco se errore noto
    blocked, reason, lesson = check_before_action(
        "SCRIPT", "write_script",
        {"topic": idea.get("topic", ""), "idea": idea["title"][:50], "video_type": video_type}
    )
    if blocked:
        logger.error(f"[MEMORY BLOCK] Script writing bloccato: {reason}\nLezione: {lesson}")
        return None

    prompt_template = (BASE / "prompts" / "script_writer.md").read_text()
    prompt = prompt_template.replace("{IDEA}", idea["title"])
    prompt = prompt.replace("{LANGUAGE}", "italiano" if language == "it" else "english")
    prompt = prompt.replace("{VIDEO_TYPE}", video_type)
    prompt += build_memory_context(idea)

    # Web search: inietta contesto aggiornato sull'argomento
    try:
        from agents.web_search import get_topic_context
        web_ctx = get_topic_context(idea["title"], lang=language)
        if web_ctx:
            prompt += (
                "\n\n---\nCONTESTO WEB AGGIORNATO (fonti recenti — usa per rendere lo script preciso e attuale):\n"
                + web_ctx[:1200]
            )
            logger.info(f"[SCRIPT] Contesto web iniettato per: {idea['title'][:50]}")
    except Exception as e:
        logger.warning(f"[SCRIPT] web_search skip: {e}")

    raw = ask_claude(prompt, model="sonnet")
    if not raw:
        remember_error("SCRIPT", "claude_no_response", "Claude non ha risposto", "Verifica rate limit e connessione")
        return None

    try:
        start = raw.index("{")
        end = raw.rindex("}") + 1
        result = json.loads(raw[start:end])
        remember_success("SCRIPT", "claude_no_response")
        return result
    except (ValueError, json.JSONDecodeError) as e:
        remember_error("SCRIPT", "json_parse_fail", f"JSON non valido: {raw[:100]}", "Claude deve rispondere SOLO con JSON puro senza markdown")
        logger.error(f"JSON parse error: {e}\nRaw: {raw[:300]}")
        return None

def add_to_queue(video_id: str, script: dict, idea: dict, language: str, video_type: str):
    queue_path = BASE / "queue.json"
    try:
        queue = json.loads(queue_path.read_text())
    except Exception:
        queue = {"videos": []}

    queue["videos"].append({
        "id": video_id,
        "title": script.get("title_card", idea["title"][:50]),
        "status": "scripted",
        "language": language,
        "video_type": video_type,
        "platform": ["instagram", "tiktok"],
        "script": script,
        "idea_id": idea["id"],
        "idea_title": idea["title"],
        "created_at": datetime.now().isoformat(),
        "scheduled_at": None
    })
    queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

def update_state(status: str, scripted_today: int = 0):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("SCRIPT", {})
    state["agents"]["SCRIPT"].update({
        "status": status,
        "scripted_today": scripted_today,
        "last_run": datetime.now().isoformat()
    })
    state["updated_at"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False))

def run(n: int = 1, topic: str = None):
    cfg = load_config()
    language = cfg.get("content", {}).get("language", "it")
    update_state("running")
    scripted = 0

    for i in range(n):
        idea = pick_idea(topic)
        if not idea:
            logger.warning("Nessuna idea raw disponibile. Esegui prima EXEL.")
            break

        video_id = f"wp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i:02d}"
        video_type = "tech_news"

        logger.info(f"Scrittura script per: {idea['title'][:60]}")
        script = write_script(idea, language, video_type)

        if not script:
            logger.error(f"Script writing fallito per idea {idea['id']}")
            continue

        mark_idea_used(idea["id"])
        add_to_queue(video_id, script, idea, language, video_type)
        scripted += 1
        logger.info(f"Script OK: {script.get('title_card', 'N/A')}")

    update_state("idle", scripted)
    logger.info(f"SCRIPT completato. Scriptati: {scripted}/{n}")
    return scripted

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [SCRIPT] %(message)s")
    run(n=1)
