# agents/logsetup.py — Centralised log setup con RotatingFileHandler
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

BASE = Path(__file__).parent.parent


def setup_logging(name: str, level: int = logging.INFO):
    """
    Configura logging con RotatingFileHandler in data/logs/<name>.log
    + StreamHandler su stdout.

    Usare all'avvio di ogni agente:
        from agents.logsetup import setup_logging
        setup_logging("opus")
    """
    LOG_DIR = BASE / "data" / "logs"
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    file_handler = RotatingFileHandler(
        LOG_DIR / f"{name}.log",
        maxBytes=5_000_000,   # 5 MB
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(name)s] %(levelname)s: %(message)s")
    )

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(name)s] %(levelname)s: %(message)s")
    )

    # Rimuove handler già installati (evita duplicati in re-import)
    root = logging.getLogger()
    if root.handlers:
        root.handlers.clear()

    logging.basicConfig(level=level, handlers=[file_handler, stream_handler])
    logging.getLogger(name).setLevel(level)
