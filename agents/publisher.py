# ~/Documents/WhyPost/agents/publisher.py
import json
import logging
import os
import time
import yaml
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

# Carica da .env quando disponibile
IG_ACCESS_TOKEN = os.getenv("IG_ACCESS_TOKEN", "")
IG_ACCOUNT_ID   = os.getenv("IG_ACCOUNT_ID", "")
TT_ACCESS_TOKEN = os.getenv("TT_ACCESS_TOKEN", "")

def publish_instagram(video: dict) -> bool:
    if not IG_ACCESS_TOKEN or not IG_ACCOUNT_ID:
        logger.warning(f"[IG STUB] Token non configurato. Video: {video['id']}")
        logger.warning("Imposta IG_ACCESS_TOKEN e IG_ACCOUNT_ID nel file .env")
        return False

    # TODO Settimana 5: implementazione completa Meta Graph API
    # Step 1: POST https://graph.facebook.com/{IG_ACCOUNT_ID}/media
    #   params: media_type=REELS, video_url=<url>, caption=<caption>
    # Step 2: wait for container ready (poll status)
    # Step 3: POST https://graph.facebook.com/{IG_ACCOUNT_ID}/media_publish
    #   params: creation_id=<container_id>

    logger.info(f"[IG] Pubblicato (stub): {video.get('title', video['id'])}")
    return True

def publish_tiktok(video: dict) -> bool:
    if not TT_ACCESS_TOKEN:
        logger.warning(f"[TT STUB] Token non configurato. Video: {video['id']}")
        return False
    # TODO Settimana 6: TikTok Content Posting API
    logger.info(f"[TT] Pubblicato (stub): {video.get('title', video['id'])}")
    return True

def update_state(status: str, published_today: int = 0):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("PUBLISHER", {})
    state["agents"]["PUBLISHER"].update({
        "status": status,
        "published_today": published_today,
        "last_run": datetime.now().isoformat()
    })
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
    published = 0

    for video in queue["videos"]:
        if video.get("status") != "ready":
            continue

        # Pubblica su ogni piattaforma abilitata
        platforms = video.get("platform", ["instagram"])
        success = False

        if "instagram" in platforms:
            if publish_instagram(video):
                success = True

        if success and "tiktok" in platforms:
            time.sleep(5)  # pausa tra pubblicazioni
            publish_tiktok(video)

        if success:
            video["status"] = "published"
            video["published_at"] = datetime.now().isoformat()
            published += 1

    if published > 0:
        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))
        logger.info(f"PUBLISHER: {published} video pubblicati")

    update_state("idle", published)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [PUBLISHER] %(message)s")
    run()
