# ~/Documents/WhyPost/agents/main.py
import json
import logging
import os
import sys
import yaml
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent.parent

# Carica .env se presente
_env_path = BASE / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())
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

def cmd_run_assets():
    from agents import asset
    asset.run()

def cmd_run_clack():
    from agents import clack
    clack.run()

def cmd_run_safety():
    from agents import safety
    safety.run()

def cmd_full_pipeline():
    """
    Pipeline completa: ideas → script → assets → render → validate → publish.
    Chiamato ogni 4h dal LaunchAgent.
    """
    logger.info("═══ WHYPOST FULL PIPELINE ═══")
    update_system_state("running")

    try:
        from agents import exel
        exel.run()
    except Exception as e:
        logger.error(f"EXEL: {e}")

    cmd_check_buffer()
    cmd_run_assets()
    cmd_run_clack()
    cmd_run_safety()
    cmd_publish_due()

    update_system_state("idle")
    logger.info("═══ PIPELINE COMPLETATA ═══")

def cmd_plan_week():
    """
    Pianifica la settimana: controlla buffer, genera script per i giorni mancanti.
    Ogni giorno usa il topic in config.yaml daily_topics se presente.
    """
    logger.info("═══ PIANIFICA SETTIMANA ═══")
    update_system_state("running")
    from agents import script_writer
    cfg = load_config()
    target = cfg.get("buffer", {}).get("target_days", 7)
    current = count_buffer()
    needed = max(0, target - current)
    logger.info(f"Buffer: {current}/{target}. Da generare: {needed}")
    if needed > 0:
        script_writer.run(n=needed)
    update_system_state("idle")
    logger.info("═══ PIANIFICA COMPLETATA ═══")

def cmd_status():
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
        print(json.dumps(state, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Errore: {e}")

COMMANDS = {
    "check_buffer":  cmd_check_buffer,
    "run_assets":    cmd_run_assets,
    "run_clack":     cmd_run_clack,
    "run_safety":    cmd_run_safety,
    "publish_due":   cmd_publish_due,
    "full_pipeline": cmd_full_pipeline,
    "plan_week":     cmd_plan_week,
    "status":        cmd_status,
}

if __name__ == "__main__":
    from agents.logsetup import setup_logging
    setup_logging("main")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd in COMMANDS:
        COMMANDS[cmd]()
    else:
        logger.error(f"Comando sconosciuto: {cmd}")
        logger.error(f"Disponibili: {list(COMMANDS.keys())}")
        sys.exit(1)
