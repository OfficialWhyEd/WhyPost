# ~/Documents/WhyPost/agents/main.py
import json
import logging
import sys
import yaml
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

def load_config():
    return yaml.safe_load((BASE / "config.yaml").read_text())

def count_buffer() -> int:
    try:
        queue = json.loads((BASE / "queue.json").read_text())
        return sum(1 for v in queue.get("videos", []) if v.get("status") in ("ready", "rendered"))
    except Exception:
        return 0

def update_system_state(status: str):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}, "buffer": {}}
    state["system"] = status
    state["buffer"]["ready_videos"] = count_buffer()
    state["updated_at"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False))

def cmd_check_buffer():
    from agents import script_writer
    cfg = load_config()
    target = cfg.get("buffer", {}).get("target_days", 7)
    current = count_buffer()
    needed = target - current

    logger.info(f"Buffer: {current}/{target} giorni. Needed: {needed}")

    if needed <= 0:
        logger.info("Buffer pieno — nessuna azione")
        return

    # Determina topic del giorno
    from datetime import date
    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    today_key = day_names[date.today().weekday()]
    daily_topics = cfg.get("daily_topics", {})
    topic = daily_topics.get(today_key)

    if topic:
        logger.info(f"Argomento del giorno: {topic}")
    else:
        logger.info("Argomento auto dalla whitelist")

    update_system_state("running")
    script_writer.run(n=needed, topic=topic)
    update_system_state("idle")

def cmd_publish_due():
    from agents import publisher
    publisher.run()

def cmd_status():
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
        print(json.dumps(state, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Errore: {e}")

COMMANDS = {
    "check_buffer": cmd_check_buffer,
    "publish_due":  cmd_publish_due,
    "status":       cmd_status,
}

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [MAIN] %(message)s")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd in COMMANDS:
        COMMANDS[cmd]()
    else:
        logger.error(f"Comando sconosciuto: {cmd}")
        logger.error(f"Disponibili: {list(COMMANDS.keys())}")
        sys.exit(1)
