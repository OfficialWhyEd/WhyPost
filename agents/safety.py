# ~/Documents/WhyPost/agents/safety.py
import json
import logging
import yaml
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

HARD_RULES = {
    "required_script_fields": ["hook", "body", "cta"],
    "min_body_points": 3,
    "min_duration": 15,
    "max_duration": 65,
}

def check_video(video: dict) -> tuple[bool, str]:
    script = video.get("script", {})

    # Controlla campi obbligatori
    for field in HARD_RULES["required_script_fields"]:
        if not script.get(field):
            return False, f"Campo mancante: {field}"

    # Lunghezza body
    body = script.get("body", [])
    if len(body) < HARD_RULES["min_body_points"]:
        return False, f"Body troppo corto: {len(body)} punti (min {HARD_RULES['min_body_points']})"

    # Durata stimata
    duration = script.get("duration_estimate", 0)
    if duration < HARD_RULES["min_duration"]:
        return False, f"Troppo corto: {duration}s (min {HARD_RULES['min_duration']})"
    if duration > HARD_RULES["max_duration"]:
        return False, f"Troppo lungo: {duration}s (max {HARD_RULES['max_duration']})"

    # Asset audio presente
    assets = video.get("assets", {})
    if not assets.get("audio"):
        return False, "Audio TTS mancante"

    return True, "OK"

def update_state(status: str):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("SAFETY", {})
    state["agents"]["SAFETY"].update({"status": status, "last_run": datetime.now().isoformat()})
    state["updated_at"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False))

def run():
    queue_path = BASE / "queue.json"
    try:
        queue = json.loads(queue_path.read_text())
    except Exception:
        logger.error("queue.json non trovato")
        return

    update_state("running")
    checked = 0

    for video in queue["videos"]:
        if video.get("status") not in ("assets_ready", "rendered"):
            continue
        ok, reason = check_video(video)
        if ok:
            video["status"] = "ready"
            logger.info(f"SAFETY OK: {video['id']}")
        else:
            video["status"] = "needs_fix"
            video["safety_fail_reason"] = reason
            logger.warning(f"SAFETY FAIL {video['id']}: {reason}")
        checked += 1

    if checked > 0:
        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

    update_state("idle")
    logger.info(f"SAFETY: controllati {checked} video")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [SAFETY] %(message)s")
    run()
