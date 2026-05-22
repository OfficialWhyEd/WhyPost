# ~/Documents/WhyPost/agents/safety.py
import json
import logging
import yaml
from pathlib import Path
from datetime import datetime, date, timedelta

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

HARD_RULES = {
    "required_script_fields": ["hook", "body", "cta"],
    "min_body_points": 3,
    "min_duration": 15,
    "max_duration": 65,
}

# Soglie audio (ms)
AUDIO_MIN_MS = 15000
AUDIO_MAX_MS = 65000

# Soglia similarità per duplicati (0–100)
DUPLICATE_THRESHOLD = 85


def _similarity(a: str, b: str) -> float:
    """
    Calcola similarità stringa con SequenceMatcher (0.0–100.0).
    Usato per rilevare hook duplicati.
    """
    from difflib import SequenceMatcher
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio() * 100


def _load_blacklist(cfg: dict) -> list[str]:
    """Ritorna la blacklist da config.yaml (content.blacklist), normalizzata lowercase."""
    words = cfg.get("content", {}).get("blacklist", [])
    return [w.lower() for w in words if w]


def _check_blacklist(video: dict, cfg: dict) -> tuple[bool, str]:
    """
    Controlla che hook + body non contengano parole dalla blacklist (case-insensitive).
    Ritorna (True, 'OK') se pulito, (False, motivo) se trovata una parola vietata.
    """
    blacklist = _load_blacklist(cfg)
    if not blacklist:
        return True, "OK"

    script = video.get("script", {})
    hook = script.get("hook", "").lower()
    body_text = " ".join(script.get("body", [])).lower()
    full_text = f"{hook} {body_text}"

    for word in blacklist:
        if word in full_text:
            logger.warning(f"[SAFETY] Blacklist hit: '{word}' trovato in {video['id']}")
            return False, f"Parola vietata: '{word}'"
    return True, "OK"


def _check_duplicate_hook(video: dict, queue: dict) -> tuple[bool, str]:
    """
    Verifica che l'hook non sia uguale (> 85% similarità) a un video già in queue.
    Confronta solo contro video con status diverso da 'needs_fix' e diverso id.
    """
    hook = video.get("script", {}).get("hook", "").strip()
    if not hook:
        return True, "OK"

    vid_id = video.get("id", "")
    for other in queue.get("videos", []):
        if other.get("id") == vid_id:
            continue
        if other.get("status") == "needs_fix":
            continue
        other_hook = other.get("script", {}).get("hook", "").strip()
        if not other_hook:
            continue
        sim = _similarity(hook, other_hook)
        if sim > DUPLICATE_THRESHOLD:
            logger.warning(
                f"[SAFETY] Hook duplicato: {video['id']} ≈ {other['id']} "
                f"(similarità {sim:.1f}%)"
            )
            return False, f"Hook simile a video esistente '{other['id']}' ({sim:.0f}%)"
    return True, "OK"


def _check_audio_duration(video: dict) -> tuple[bool, str]:
    """
    Se assets.audio_duration_ms è presente, verifica che sia tra 15000 e 65000 ms.
    """
    audio_ms = video.get("assets", {}).get("audio_duration_ms")
    if audio_ms is None:
        return True, "OK"  # campo assente → skip
    try:
        audio_ms = int(audio_ms)
    except (ValueError, TypeError):
        return True, "OK"

    if audio_ms < AUDIO_MIN_MS:
        return False, f"Audio troppo corto: {audio_ms}ms (min {AUDIO_MIN_MS}ms)"
    if audio_ms > AUDIO_MAX_MS:
        return False, f"Audio troppo lungo: {audio_ms}ms (max {AUDIO_MAX_MS}ms)"
    return True, "OK"


def check_video(video: dict, cfg: dict | None = None, queue: dict | None = None) -> tuple[bool, str]:
    script = video.get("script", {})
    for field in HARD_RULES["required_script_fields"]:
        if not script.get(field):
            return False, f"Campo mancante: {field}"
    body = script.get("body", [])
    if len(body) < HARD_RULES["min_body_points"]:
        return False, f"Body troppo corto: {len(body)} punti (min {HARD_RULES['min_body_points']})"
    duration = script.get("duration_estimate", 0)
    if duration < HARD_RULES["min_duration"]:
        return False, f"Troppo corto: {duration}s (min {HARD_RULES['min_duration']})"
    if duration > HARD_RULES["max_duration"]:
        return False, f"Troppo lungo: {duration}s (max {HARD_RULES['max_duration']})"
    assets = video.get("assets", {})
    if not assets.get("audio"):
        return False, "Audio TTS mancante"

    # ── Check aggiuntivi (Settimana 6) ────────────────────────────────────────
    # 1. Blacklist
    if cfg:
        ok, reason = _check_blacklist(video, cfg)
        if not ok:
            return False, reason

    # 2. Duplicati hook
    if queue:
        ok, reason = _check_duplicate_hook(video, queue)
        if not ok:
            return False, reason

    # 3. Durata audio (se presente)
    ok, reason = _check_audio_duration(video)
    if not ok:
        return False, reason

    return True, "OK"


def _load_cfg() -> dict:
    try:
        return yaml.safe_load((BASE / "config.yaml").read_text()) or {}
    except Exception:
        return {}


def _enabled_platforms(cfg: dict) -> list[str]:
    """Ritorna le piattaforme abilitate in ordine di priorità."""
    platforms = cfg.get("platforms", {})
    enabled = [(k, v) for k, v in platforms.items() if v.get("enabled")]
    enabled.sort(key=lambda x: x[1].get("order", 99))
    return [k for k, _ in enabled]


def _slots_for_day(cfg: dict) -> list[str]:
    """Ritorna gli slot di pubblicazione dalla config (es. ['08:00', '13:30', '20:00'])."""
    return cfg.get("schedule", {}).get("slots", ["08:00", "13:30", "20:00"])


def _already_scheduled_at(queue: dict, platform: str) -> set[str]:
    """Restituisce tutti gli scheduled_at già assegnati per questa piattaforma."""
    taken = set()
    for v in queue.get("videos", []):
        if platform in v.get("platform", []) and v.get("scheduled_at"):
            taken.add(v["scheduled_at"][:16])  # YYYY-MM-DDTHH:MM
    return taken


def _assign_publish_schedule(video: dict, queue: dict, cfg: dict):
    """
    Assegna scheduled_at e platform al video basandosi sugli slot liberi.
    Crea subito l'evento Google Calendar con titolo e orario precisi.
    """
    platforms = _enabled_platforms(cfg)
    if not platforms:
        platforms = ["instagram"]

    slots = _slots_for_day(cfg)
    videos_per_day = cfg.get("schedule", {}).get("videos_per_day", 2)
    script = video.get("script", {})
    title = script.get("title_card", video.get("idea_title", video["id"]))

    # Cerca il primo slot libero partendo da domani mattina
    candidate = datetime.now() + timedelta(hours=1)
    # Arrotonda al prossimo slot
    for _ in range(30):  # max 30 giorni avanti
        for slot_str in slots:
            h, m = map(int, slot_str.split(":"))
            slot_dt = candidate.replace(hour=h, minute=m, second=0, microsecond=0)
            if slot_dt <= datetime.now():
                continue
            slot_key = slot_dt.strftime("%Y-%m-%dT%H:%M")
            # Conta quanti video sono già schedulati in questo slot su tutte le piattaforme
            all_taken = set()
            for p in platforms:
                all_taken |= _already_scheduled_at(queue, p)
            if slot_key not in all_taken:
                video["scheduled_at"] = slot_dt.isoformat()
                video["platform"] = platforms
                logger.info(f"[SAFETY] Schedulato {video['id']} → {slot_key} su {platforms}")

                # Crea eventi calendario per ogni piattaforma abilitata
                try:
                    from agents.calendar_agent import add_publish_event
                    for p in platforms:
                        add_publish_event(
                            video_id=video["id"],
                            title=title,
                            platform=p,
                            publish_at=slot_dt,
                            hook=script.get("hook", ""),
                        )
                except Exception as e:
                    logger.warning(f"[SAFETY] Calendar skip: {e}")
                return

        # Avanza al giorno successivo
        candidate = (candidate + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

    # Fallback: schedula per domani 08:00
    tomorrow = (datetime.now() + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
    video["scheduled_at"] = tomorrow.isoformat()
    video["platform"] = platforms
    logger.warning(f"[SAFETY] Slot fallback: {video['id']} → {tomorrow.isoformat()}")


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

    cfg = _load_cfg()
    update_state("running")
    checked = 0

    for video in queue["videos"]:
        if video.get("status") not in ("assets_ready", "rendered"):
            continue
        ok, reason = check_video(video, cfg=cfg, queue=queue)
        if ok:
            video["status"] = "ready"
            # Assegna slot di pubblicazione preciso e crea evento calendario
            if not video.get("scheduled_at"):
                _assign_publish_schedule(video, queue, cfg)
            logger.info(f"[SAFETY] OK: {video['id']} → {video.get('scheduled_at', 'N/A')}")
        else:
            video["status"] = "needs_fix"
            video["safety_fail_reason"] = reason
            logger.warning(f"[SAFETY] FAIL {video['id']}: {reason}")
        checked += 1

    if checked > 0:
        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

    update_state("idle")
    logger.info(f"[SAFETY] controllati {checked} video")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [SAFETY] %(message)s")
    run()
