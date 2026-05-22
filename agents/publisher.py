# ~/Documents/WhyPost/agents/publisher.py
import json
import logging
import os
import time
import requests
import yaml
from pathlib import Path
from datetime import datetime, date, timedelta

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

IG_ACCESS_TOKEN = os.getenv("IG_ACCESS_TOKEN", "")
IG_ACCOUNT_ID   = os.getenv("IG_ACCOUNT_ID", "")
TT_ACCESS_TOKEN = os.getenv("TT_ACCESS_TOKEN", "")

def _count_published_today() -> int:
    """Conta quanti video sono stati pubblicati oggi (su IG) per il rate limiter."""
    try:
        queue = json.loads((BASE / "queue.json").read_text())
        today = date.today().isoformat()
        return sum(
            1 for v in queue.get("videos", [])
            if v.get("status") == "published"
            and (v.get("published_at") or "")[:10] == today
            and "instagram" in v.get("platform", ["instagram"])
        )
    except Exception:
        return 0

def _load_daily_limit() -> int:
    try:
        cfg = yaml.safe_load((BASE / "config.yaml").read_text())
        return cfg.get("platforms", {}).get("instagram", {}).get("daily_limit", 50)
    except Exception:
        return 50

def _week_start() -> datetime:
    """
    La settimana IG parte da martedì alle 06:00 (ora locale).
    Se oggi è martedì ma sono le 05:59, la finestra è ancora quella della settimana scorsa.
    """
    now = datetime.now()
    # weekday(): Mon=0, Tue=1 ... Sun=6
    days_since_tuesday = (now.weekday() - 1) % 7
    last_tuesday = now - timedelta(days=days_since_tuesday)
    reset = last_tuesday.replace(hour=6, minute=0, second=0, microsecond=0)
    # Se siamo martedì prima delle 06:00, torna al martedì precedente
    if reset > now:
        reset -= timedelta(weeks=1)
    return reset

def _count_published_this_week() -> int:
    """Conta i video IG pubblicati nella finestra settimanale corrente (da martedì 06:00)."""
    try:
        queue = json.loads((BASE / "queue.json").read_text())
        since = _week_start()
        return sum(
            1 for v in queue.get("videos", [])
            if v.get("status") == "published"
            and v.get("published_at")
            and datetime.fromisoformat(v["published_at"]) >= since
            and "instagram" in v.get("platform", ["instagram"])
        )
    except Exception:
        return 0

def _load_weekly_limit() -> int:
    try:
        cfg = yaml.safe_load((BASE / "config.yaml").read_text())
        return cfg.get("platforms", {}).get("instagram", {}).get("weekly_limit", 50)
    except Exception:
        return 50

def _weekly_slots_left() -> tuple[int, int, int]:
    """
    Ritorna (usati, limite_effettivo, rimasti) rispettando il safety_buffer_pct.
    Il limite effettivo è weekly_limit * (1 - safety_buffer_pct/100).
    Es: weekly_limit=50, safety_buffer_pct=20 → max_usabile=40
    """
    try:
        cfg = yaml.safe_load((BASE / "config.yaml").read_text())
        ig = cfg.get("platforms", {}).get("instagram", {})
        weekly_limit = ig.get("weekly_limit", 50)
        safety_pct = ig.get("weekly_safety_buffer_pct", 20)
    except Exception:
        weekly_limit, safety_pct = 50, 20

    max_usabile = int(weekly_limit * (1 - safety_pct / 100))
    usati = _count_published_this_week()
    rimasti = max(0, max_usabile - usati)
    return usati, max_usabile, rimasti

def publish_instagram(video: dict) -> bool:
    """
    Pubblica un Reel su Instagram via Meta Graph API v20.
    Richiede: IG_ACCESS_TOKEN, IG_ACCOUNT_ID, PUBLIC_BASE_URL nel .env
    Setup: Meta Business Suite → System Users → Generate Token (con permissions: instagram_content_publish)
    """
    token = os.getenv("IG_ACCESS_TOKEN", IG_ACCESS_TOKEN)
    account_id = os.getenv("IG_ACCOUNT_ID", IG_ACCOUNT_ID)

    if not token or not account_id:
        logger.warning("[IG] Token mancante — imposta IG_ACCESS_TOKEN e IG_ACCOUNT_ID in .env")
        return False

    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
    if not public_base:
        logger.warning("[IG] PUBLIC_BASE_URL mancante — avvia: cloudflared tunnel --url http://localhost:5174")
        return False

    vid_id = video["id"]
    video_url = f"{public_base}/video/{vid_id}/render"
    script = video.get("script", {})
    caption = script.get("caption", script.get("hook", ""))[:2200]
    hashtags = " ".join(script.get("hashtags", [])[:30])
    full_caption = f"{caption}\n\n{hashtags}".strip()

    graph = "https://graph.facebook.com/v20.0"

    # Step 1: Crea container Reels
    try:
        resp = requests.post(
            f"{graph}/{account_id}/media",
            data={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": full_caption,
                "share_to_feed": "true",
                "access_token": token,
            },
            timeout=30,
        )
        resp.raise_for_status()
        container_id = resp.json().get("id")
        if not container_id:
            logger.error(f"[IG] Container fallito: {resp.json()}")
            return False
        logger.info(f"[IG] Container creato: {container_id}")
    except Exception as e:
        logger.error(f"[IG] Container error: {e}")
        return False

    # Step 2: Attendi che il container sia pronto (max 5 min, poll ogni 10s)
    for attempt in range(30):
        time.sleep(10)
        try:
            status_resp = requests.get(
                f"{graph}/{container_id}",
                params={"fields": "status_code", "access_token": token},
                timeout=15,
            )
            status_code = status_resp.json().get("status_code", "IN_PROGRESS")
            logger.info(f"[IG] Container status ({attempt + 1}/30): {status_code}")
            if status_code == "FINISHED":
                break
            if status_code in ("ERROR", "EXPIRED"):
                logger.error(f"[IG] Container fallito: {status_code}")
                return False
        except Exception as e:
            logger.warning(f"[IG] Status poll error: {e}")
    else:
        logger.error("[IG] Timeout attesa container (5 min)")
        return False

    # Step 3: Pubblica
    try:
        pub_resp = requests.post(
            f"{graph}/{account_id}/media_publish",
            data={"creation_id": container_id, "access_token": token},
            timeout=30,
        )
        pub_resp.raise_for_status()
        media_id = pub_resp.json().get("id")
        logger.info(f"[IG] ✓ Pubblicato! Media ID: {media_id}")

        # Salva media_id per fetch metriche successive (telemetry)
        # ig_post_id = nome spec; ig_media_id = alias legacy
        video["ig_post_id"]  = media_id
        video["ig_media_id"] = media_id

        # Aggiungi al calendario
        try:
            from agents.calendar_agent import add_publish_event
            add_publish_event(
                video_id=vid_id,
                title=script.get("title_card", vid_id),
                platform="instagram",
                publish_at=datetime.now(),
                hook=script.get("hook", ""),
            )
        except Exception:
            pass

        return True
    except Exception as e:
        logger.error(f"[IG] Publish error: {e}")
        return False

def publish_tiktok(video: dict) -> bool:
    """
    Pubblica su TikTok via Content Posting API v2 (Direct Post).
    Richiede: TT_ACCESS_TOKEN nel .env
    Setup: TikTok Developer Portal → App → Content Posting API → video.publish
    Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
    """
    token = os.getenv("TT_ACCESS_TOKEN", TT_ACCESS_TOKEN)
    if not token:
        logger.warning("[TT] TT_ACCESS_TOKEN mancante — imposta in .env")
        return False

    public_base = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
    if not public_base:
        logger.warning("[TT] PUBLIC_BASE_URL mancante")
        return False

    vid_id = video["id"]
    video_url = f"{public_base}/video/{vid_id}/render"
    script = video.get("script", {})
    caption = script.get("hook", "")[:2200]
    hashtags = " ".join(f"#{t}" for t in script.get("hashtags", [])[:5])
    title = f"{caption} {hashtags}".strip()[:150]

    try:
        # Step 1: Init upload (Direct Post — no user confirmation needed)
        init_resp = requests.post(
            "https://open.tiktokapis.com/v2/post/publish/video/init/",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            json={
                "post_info": {
                    "title": title,
                    "privacy_level": "PUBLIC_TO_EVERYONE",
                    "disable_duet": False,
                    "disable_comment": False,
                    "disable_stitch": False,
                    "video_cover_timestamp_ms": 1000,
                },
                "source_info": {
                    "source": "PULL_FROM_URL",
                    "video_url": video_url,
                }
            },
            timeout=30,
        )
        init_resp.raise_for_status()
        data = init_resp.json().get("data", {})
        publish_id = data.get("publish_id")
        if not publish_id:
            logger.error(f"[TT] Init fallito: {init_resp.json()}")
            return False
        logger.info(f"[TT] Publish ID: {publish_id}")

        # Step 2: Poll status (max 3 min)
        for attempt in range(18):
            time.sleep(10)
            status_resp = requests.post(
                "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json; charset=UTF-8",
                },
                json={"publish_id": publish_id},
                timeout=15,
            )
            status = status_resp.json().get("data", {}).get("status", "PROCESSING_UPLOAD")
            logger.info(f"[TT] Status ({attempt + 1}/18): {status}")
            if status == "PUBLISH_COMPLETE":
                logger.info(f"[TT] ✓ Pubblicato! Publish ID: {publish_id}")
                # tt_post_id = nome spec; tt_publish_id = alias legacy
                video["tt_post_id"]    = publish_id
                video["tt_publish_id"] = publish_id
                return True
            if status in ("FAILED", "PUBLISH_FAILED"):
                logger.error(f"[TT] Pubblicazione fallita: {status}")
                return False

        logger.error("[TT] Timeout (3 min)")
        return False

    except Exception as e:
        logger.error(f"[TT] Error: {e}")
        return False


def publish_youtube(video: dict) -> bool:
    """
    Pubblica su YouTube Shorts via YouTube Data API v3.
    Richiede: YT_CLIENT_SECRET_PATH (OAuth) o YT_API_KEY nel .env
    Setup: Google Cloud Console → YouTube Data API v3 → OAuth 2.0
    Docs: https://developers.google.com/youtube/v3/guides/uploading_a_video
    """
    client_secrets = os.getenv(
        "YT_CLIENT_SECRET_PATH",
        str(BASE / "data" / "yt_credentials.json")
    )
    token_path = str(BASE / "data" / "yt_token.json")

    if not Path(client_secrets).exists():
        logger.warning("[YT] yt_credentials.json mancante — imposta in data/yt_credentials.json")
        return False

    vid_id = video["id"]
    renders_dir = BASE / "data" / "renders" / vid_id
    mp4s = list(renders_dir.glob("*.mp4")) if renders_dir.exists() else []
    if not mp4s:
        logger.error(f"[YT] File render non trovato per {vid_id}")
        return False
    video_file = str(mp4s[0])

    script = video.get("script", {})
    title_card = script.get("title_card", video.get("idea_title", vid_id))
    hook = script.get("hook", "")
    hashtags = " ".join(f"#{t}" for t in script.get("hashtags", [])[:5])
    # YouTube Shorts: titolo max 100 char, descrizione con #Shorts obbligatorio
    yt_title = f"{title_card}"[:100]
    yt_description = f"{hook}\n\n{hashtags}\n\n#Shorts\n\nCreato con WhyPost 🤖"[:5000]

    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload

        SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
        creds = None

        if Path(token_path).exists():
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                Path(token_path).write_text(creds.to_json())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(client_secrets, SCOPES)
                creds = flow.run_local_server(port=0)
                Path(token_path).write_text(creds.to_json())

        yt = build("youtube", "v3", credentials=creds)

        body = {
            "snippet": {
                "title": yt_title,
                "description": yt_description,
                "tags": script.get("hashtags", [])[:20],
                "categoryId": "28",  # Science & Technology
                "defaultLanguage": video.get("language", "it"),
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False,
            },
        }

        media = MediaFileUpload(video_file, chunksize=-1, resumable=True, mimetype="video/mp4")
        request_yt = yt.videos().insert(part="snippet,status", body=body, media_body=media)

        response = None
        while response is None:
            _, response = request_yt.next_chunk()

        yt_video_id = response.get("id")
        logger.info(f"[YT] ✓ Pubblicato! ID: {yt_video_id} — https://youtu.be/{yt_video_id}")
        video["yt_video_id"] = yt_video_id
        return True

    except Exception as e:
        logger.error(f"[YT] Error: {e}")
        return False

def update_state(status: str, published_today: int = 0, extra: dict | None = None):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("PUBLISHER", {})
    state["agents"]["PUBLISHER"].update({
        "status": status,
        "published_today": published_today,
        "last_run": datetime.now().isoformat(),
        **(extra or {}),
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

    # ── Limite settimanale IG (reset martedì 06:00) ──────────────────────────
    usati_week, max_week, rimasti_week = _weekly_slots_left()
    week_since = _week_start().strftime("%a %d/%m %H:%M")
    logger.info(f"[PUBLISHER] Quota settimanale IG: {usati_week}/{max_week} usati (da {week_since}), rimasti: {rimasti_week}")
    if rimasti_week <= 0:
        logger.warning(
            f"[PUBLISHER] Quota settimanale esaurita ({usati_week}/{max_week}) — "
            f"si resetta martedì alle 06:00. Skip."
        )
        update_state("idle", _count_published_today())
        return

    # ── Limite giornaliero ──────────────────────────────────────────────────
    daily_limit = _load_daily_limit()
    already_today = _count_published_today()
    if already_today >= daily_limit:
        logger.warning(f"[PUBLISHER] Limite giornaliero IG raggiunto ({already_today}/{daily_limit}) — skip")
        update_state("idle", already_today)
        return

    # Slot disponibili = min(rimasti oggi, rimasti questa settimana)
    remaining = min(daily_limit - already_today, rimasti_week)
    logger.info(f"[PUBLISHER] Slot disponibili: {remaining} (giornaliero: {daily_limit - already_today}, settimanale: {rimasti_week})")

    now = datetime.now()

    for video in queue["videos"]:
        if video.get("status") != "ready":
            continue

        # Rispetta scheduled_at — pubblica solo se è arrivato il momento
        scheduled_at = video.get("scheduled_at")
        if scheduled_at:
            try:
                if datetime.fromisoformat(scheduled_at) > now:
                    continue  # troppo presto
            except Exception:
                pass

        if published >= remaining:
            logger.info("[PUBLISHER] Limite raggiunto — stop")
            break

        platforms = video.get("platform", ["instagram"])
        results: dict[str, bool] = {}

        if "instagram" in platforms:
            results["instagram"] = publish_instagram(video)
            if results["instagram"]:
                time.sleep(3)

        if "tiktok" in platforms:
            results["tiktok"] = publish_tiktok(video)
            if results.get("tiktok"):
                time.sleep(3)

        if "youtube" in platforms:
            results["youtube"] = publish_youtube(video)

        any_success = any(results.values())
        if any_success:
            video["status"] = "published"
            video["published_at"] = now.isoformat()
            video["publish_results"] = results
            published += 1
            logger.info(f"[PUBLISHER] {video['id']} pubblicato: {results}")

    if published > 0:
        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))
        logger.info(f"PUBLISHER: {published} video pubblicati")

    total_today = already_today + published
    usati_week_final, max_week_final, _ = _weekly_slots_left()
    update_state("idle", total_today, {
        "weekly_used": usati_week_final,
        "weekly_max": max_week_final,
        "weekly_reset": "martedì 06:00",
    })

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [PUBLISHER] %(message)s")
    run()
