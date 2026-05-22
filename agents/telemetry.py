# agents/telemetry.py — fetch metriche social + aggiorna learning DB
import json
import logging
import os
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

# Carica .env
_env_path = BASE / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())


def fetch_ig_insights(media_id: str, token: str) -> dict:
    """Fetches impressions/likes/comments/shares per un media pubblicato."""
    try:
        import requests
        url = f"https://graph.facebook.com/v20.0/{media_id}/insights"
        params = {
            "metric": "impressions,reach,likes,comments,shares,saved",
            "access_token": token,
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json().get("data", [])
        result = {}
        for item in data:
            result[item["name"]] = item.get("values", [{}])[0].get("value", 0)
        return result
    except Exception as e:
        logger.warning(f"[TELEMETRY] IG insights error ({media_id}): {e}")
        return {}


def update_published_metrics():
    """Per ogni video published con ig_media_id, fetch metriche e salva in learning DB."""
    token = os.getenv("IG_ACCESS_TOKEN", "")
    if not token:
        logger.warning("[TELEMETRY] IG_ACCESS_TOKEN mancante — skip fetch")
        return 0

    queue_path = BASE / "queue.json"
    try:
        queue = json.loads(queue_path.read_text())
    except Exception:
        return 0

    updated = 0
    changed = False
    for video in queue.get("videos", []):
        if video.get("status") != "published":
            continue
        media_id = video.get("ig_media_id") or video.get("ig_post_id")
        if not media_id:
            continue

        # Fetch solo se il video è stato pubblicato da almeno 24h
        published_at = video.get("published_at")
        if published_at:
            try:
                age_h = (datetime.now() - datetime.fromisoformat(published_at)).total_seconds() / 3600
                if age_h < 24:
                    logger.info(f"[TELEMETRY] {video['id']} pubblicato {age_h:.1f}h fa — skip (< 24h)")
                    continue
            except Exception:
                pass

        # Non rifetchare se già fatto nelle ultime 12h
        last_fetch = video.get("metrics_fetched_at")
        if last_fetch:
            try:
                elapsed = (datetime.now() - datetime.fromisoformat(last_fetch)).total_seconds()
                if elapsed < 43200:
                    continue
            except Exception:
                pass

        insights = fetch_ig_insights(media_id, token)
        if not insights:
            continue

        video["metrics"] = insights
        video["metrics_fetched_at"] = datetime.now().isoformat()
        # Scrive anche i campi top-level per lettura rapida da Mission Control
        video["views"]    = insights.get("impressions", 0)
        video["likes"]    = insights.get("likes", 0)
        video["comments"] = insights.get("comments", 0)
        changed = True
        updated += 1
        logger.info(f"[TELEMETRY] {video['id']}: {insights}")

        # Registra outcome nella learning DB
        try:
            from agents.memory import learn_from_video, init_learning_db
            init_learning_db()
            script = video.get("script", {})
            learn_from_video(
                video_id=video["id"],
                template=video.get("video_type", "tech_news"),
                topic=video.get("idea_title", ""),
                language=video.get("language", "it"),
                hook_style=script.get("hook", "")[:80],
                duration_est=0,
                platform="instagram",
                views=insights.get("impressions", 0),
                likes=insights.get("likes", 0),
                comments=insights.get("comments", 0),
                shares=insights.get("shares", 0),
            )
        except Exception as e:
            logger.warning(f"[TELEMETRY] learn_from_video: {e}")

    if changed:
        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

    return updated


def update_state(status: str, extra: dict | None = None):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("TELEMETRY", {})
    state["agents"]["TELEMETRY"].update({
        "status": status,
        "last_run": datetime.now().isoformat(),
        **(extra or {}),
    })
    state["updated_at"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def run():
    logger.info("[TELEMETRY] Fetch metriche social...")
    update_state("running")
    n = update_published_metrics()
    logger.info(f"[TELEMETRY] {n} video aggiornati con metriche")
    update_state("idle", {"metrics_updated": n})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [TELEMETRY] %(message)s")
    run()
