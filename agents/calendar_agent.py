# agents/calendar_agent.py
# Sincronizza il calendario di pubblicazione con Google Calendar.
# Quando un video viene pubblicato (o schedulato), appare nel calendario di Edoardo.
# Setup: google-auth + google-api-python-client + token OAuth2 in data/gcal_token.json

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path

BASE = Path(__file__).parent.parent
TOKEN_PATH = BASE / "data" / "gcal_token.json"
CREDS_PATH = BASE / "data" / "gcal_credentials.json"

logger = logging.getLogger(__name__)

PLATFORM_EMOJIS = {
    "instagram": "📷",
    "tiktok": "🎵",
    "youtube": "▶️",
}

CALENDAR_NAME = "WhyPost"  # nome del calendario dedicato (creato automaticamente)


# ─── Google Calendar client ──────────────────────────────────────────────────

def _get_calendar_service():
    """Restituisce il service Google Calendar autenticato."""
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build

        SCOPES = ["https://www.googleapis.com/auth/calendar"]
        creds = None

        if TOKEN_PATH.exists():
            creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            elif CREDS_PATH.exists():
                flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
                creds = flow.run_local_server(port=0)
                TOKEN_PATH.write_text(creds.to_json())
            else:
                logger.warning("[GCAL] credentials.json mancante — Google Calendar disabilitato")
                return None

        return build("calendar", "v3", credentials=creds)
    except ImportError:
        logger.warning("[GCAL] google-api-python-client non installato — pip install google-api-python-client google-auth-oauthlib")
        return None
    except Exception as e:
        logger.warning(f"[GCAL] Auth error: {e}")
        return None


def _get_or_create_calendar(service) -> str | None:
    """Trova o crea il calendario 'WhyPost'. Restituisce l'ID."""
    try:
        calendars = service.calendarList().list().execute()
        for cal in calendars.get("items", []):
            if cal.get("summary") == CALENDAR_NAME:
                return cal["id"]

        # Crea nuovo calendario
        new_cal = service.calendars().insert(body={
            "summary": CALENDAR_NAME,
            "description": "Video pubblicati e schedulati da WhyPost",
            "timeZone": "Europe/Rome",
        }).execute()
        logger.info(f"[GCAL] Calendario '{CALENDAR_NAME}' creato: {new_cal['id']}")
        return new_cal["id"]
    except Exception as e:
        logger.error(f"[GCAL] Calendar setup: {e}")
        return None


# ─── Public API ──────────────────────────────────────────────────────────────

def add_publish_event(
    video_id: str,
    title: str,
    platform: str,
    publish_at: datetime,
    duration_s: int = 60,
    hook: str = "",
) -> bool:
    """
    Aggiunge un evento al calendario Google per la pubblicazione di un video.
    Restituisce True se l'evento è stato creato, False altrimenti.
    """
    service = _get_calendar_service()
    if not service:
        # Fallback: salva in local_schedule.json
        _save_local(video_id, title, platform, publish_at, duration_s, hook)
        return False

    cal_id = _get_or_create_calendar(service)
    if not cal_id:
        _save_local(video_id, title, platform, publish_at, duration_s, hook)
        return False

    emoji = PLATFORM_EMOJIS.get(platform, "🎬")
    end_at = publish_at + timedelta(minutes=2)  # evento breve

    event = {
        "summary": f"{emoji} {platform.upper()}: {title[:60]}",
        "description": (
            f"Video ID: {video_id}\n"
            f"Piattaforma: {platform}\n"
            f"Hook: {hook[:200] if hook else 'N/A'}\n\n"
            f"Pubblicato da WhyPost 🤖"
        ),
        "start": {
            "dateTime": publish_at.isoformat(),
            "timeZone": "Europe/Rome",
        },
        "end": {
            "dateTime": end_at.isoformat(),
            "timeZone": "Europe/Rome",
        },
        "colorId": {
            "instagram": "11",  # rosso
            "tiktok": "7",      # ciano
            "youtube": "4",     # rosso scuro
        }.get(platform, "1"),
        "reminders": {"useDefault": False, "overrides": []},
        "extendedProperties": {
            "private": {
                "video_id": video_id,
                "platform": platform,
                "whypost": "true",
            }
        },
    }

    try:
        created = service.events().insert(calendarId=cal_id, body=event).execute()
        logger.info(f"[GCAL] Evento creato: {created.get('htmlLink', '')}")
        return True
    except Exception as e:
        logger.error(f"[GCAL] Evento creation error: {e}")
        _save_local(video_id, title, platform, publish_at, duration_s, hook)
        return False


def schedule_week(videos: list[dict], start_times: dict | None = None) -> int:
    """
    Schedula una lista di video nella settimana corrente.
    start_times: {platform: [ora1, ora2, ora3], ...} — default 3 video/giorno
    Restituisce il numero di eventi creati.
    """
    if not start_times:
        start_times = {
            "instagram": ["08:00", "13:00", "19:00"],
            "tiktok":    ["09:00", "14:00", "20:00"],
        }

    from datetime import date, time as dtime
    today = date.today()
    count = 0

    for i, video in enumerate(videos):
        platform = video.get("platform", ["instagram"])[0]
        times = start_times.get(platform, ["09:00"])
        slot_time_str = times[i % len(times)]
        hour, minute = map(int, slot_time_str.split(":"))

        day_offset = i // len(times)
        pub_date = today + timedelta(days=day_offset)
        pub_dt = datetime(pub_date.year, pub_date.month, pub_date.day, hour, minute)

        script = video.get("script", {})
        ok = add_publish_event(
            video_id=video.get("id", f"vid_{i}"),
            title=script.get("title_card", video.get("idea_title", "Video"))[:60],
            platform=platform,
            publish_at=pub_dt,
            hook=script.get("hook", ""),
        )
        if ok:
            count += 1

    logger.info(f"[GCAL] {count}/{len(videos)} video schedulati nel calendario")
    return count


# ─── Local fallback (senza Google Calendar) ─────────────────────────────────

LOCAL_SCHEDULE_PATH = BASE / "data" / "local_schedule.json"

def _save_local(video_id, title, platform, publish_at, duration_s, hook):
    try:
        schedule = json.loads(LOCAL_SCHEDULE_PATH.read_text()) if LOCAL_SCHEDULE_PATH.exists() else []
    except Exception:
        schedule = []

    schedule.append({
        "video_id": video_id,
        "title": title,
        "platform": platform,
        "publish_at": publish_at.isoformat(),
        "duration_s": duration_s,
        "hook": hook[:200],
        "saved_at": datetime.now().isoformat(),
    })
    LOCAL_SCHEDULE_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_SCHEDULE_PATH.write_text(json.dumps(schedule, indent=2, ensure_ascii=False))

def get_local_schedule() -> list:
    try:
        return json.loads(LOCAL_SCHEDULE_PATH.read_text())
    except Exception:
        return []


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [GCAL] %(message)s")
    parser = argparse.ArgumentParser(description="WhyPost Google Calendar")
    parser.add_argument("--test", action="store_true", help="Crea un evento di test")
    parser.add_argument("--schedule", action="store_true", help="Mostra calendario locale")
    args = parser.parse_args()

    if args.test:
        ok = add_publish_event(
            video_id="test_001",
            title="Video di test WhyPost",
            platform="instagram",
            publish_at=datetime.now() + timedelta(hours=1),
            hook="Questo è un hook di test.",
        )
        print("Google Calendar OK" if ok else "Salvato in local_schedule.json (Google non configurato)")
    elif args.schedule:
        events = get_local_schedule()
        for e in events:
            print(f"{e['publish_at']}  [{e['platform']:10s}]  {e['title'][:50]}")
    else:
        parser.print_help()
