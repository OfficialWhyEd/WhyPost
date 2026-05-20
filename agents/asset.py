# ~/Documents/WhyPost/agents/asset.py
import asyncio
import json
import logging
import os
import subprocess
import yaml
from pathlib import Path
from datetime import datetime

try:
    import requests
    import edge_tts
except ImportError as e:
    print(f"Missing dep: {e}. Run: pip install edge-tts requests")
    exit(1)

BASE = Path(__file__).parent.parent
ASSETS_DIR = BASE / "data" / "assets"
logger = logging.getLogger(__name__)

def load_config():
    return yaml.safe_load((BASE / "config.yaml").read_text())

async def generate_tts(text: str, voice: str, output_path: Path) -> bool:
    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(output_path))
        return True
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return False

def build_tts_text(script: dict) -> str:
    parts = []
    if script.get("hook"):
        parts.append(script["hook"])
    parts.extend(script.get("body", []))
    if script.get("cta"):
        parts.append(script["cta"])
    return ". ".join(p.strip().rstrip(".") for p in parts if p)

def fetch_broll(query: str, count: int = 3) -> list:
    api_key = os.getenv("PEXELS_API_KEY", "")
    if not api_key:
        logger.warning("PEXELS_API_KEY non impostata — B-roll saltato")
        return []
    headers = {"Authorization": api_key}
    url = f"https://api.pexels.com/videos/search?query={query}&per_page={count}&orientation=portrait&size=medium"
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        videos = resp.json().get("videos", [])
        paths = []
        for v in videos[:count]:
            files = sorted(v.get("video_files", []), key=lambda f: f.get("width", 0))
            if not files:
                continue
            video_url = files[0]["link"]
            fname = ASSETS_DIR / f"broll_{v['id']}.mp4"
            if not fname.exists():
                with requests.get(video_url, stream=True, timeout=60) as r:
                    fname.write_bytes(r.content)
                logger.info(f"B-roll scaricato: {fname.name}")
            paths.append(str(fname))
        return paths
    except Exception as e:
        logger.error(f"Pexels error: {e}")
        return []

def generate_captions(audio_path: Path, output_srt: Path) -> bool:
    whisper_bins = ["whisper-cpp", "whisper", "/usr/local/bin/whisper-cpp"]
    for bin_name in whisper_bins:
        try:
            result = subprocess.run(
                [bin_name, str(audio_path), "--model", "base",
                 "--output-srt", "--output-file", str(output_srt.with_suffix(""))],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode == 0:
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    logger.warning("whisper.cpp non trovato — captions saltate")
    output_srt.write_text("")  # file vuoto come placeholder
    return False

def process_video(video: dict, cfg: dict) -> dict:
    vid_id = video["id"]
    lang = video.get("language", "it")
    voice = cfg.get("tts", {}).get("voice_it", "it-IT-IsabellaNeural") if lang == "it" \
        else cfg.get("tts", {}).get("voice_en", "en-US-JennyNeural")

    vid_dir = ASSETS_DIR / vid_id
    vid_dir.mkdir(parents=True, exist_ok=True)

    script = video.get("script", {})
    tts_text = build_tts_text(script)

    # TTS
    audio_path = vid_dir / "audio.mp3"
    tts_ok = asyncio.run(generate_tts(tts_text, voice, audio_path))
    if tts_ok:
        logger.info(f"TTS OK: {audio_path}")
    else:
        logger.error(f"TTS fallito per {vid_id}")

    # Captions
    srt_path = vid_dir / "captions.srt"
    if tts_ok and audio_path.exists():
        generate_captions(audio_path, srt_path)

    # B-roll
    search_query = video.get("idea_title", script.get("title_card", "technology"))[:50]
    broll = fetch_broll(search_query, count=3)

    return {
        "audio": str(audio_path) if tts_ok else None,
        "captions": str(srt_path) if srt_path.exists() else None,
        "broll": broll,
        "tts_text": tts_text
    }

def update_state(status: str):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("ASSET", {})
    state["agents"]["ASSET"].update({"status": status, "last_run": datetime.now().isoformat()})
    state["updated_at"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False))

def run():
    cfg = load_config()
    queue_path = BASE / "queue.json"
    try:
        queue = json.loads(queue_path.read_text())
    except Exception:
        logger.error("queue.json non trovato")
        return

    update_state("running")
    processed = 0

    for video in queue["videos"]:
        if video.get("status") != "scripted":
            continue
        logger.info(f"Processing assets: {video['id']}")
        assets = process_video(video, cfg)
        video["assets"] = assets
        video["status"] = "assets_ready"
        processed += 1

    if processed > 0:
        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))
        logger.info(f"ASSET: {processed} video processati")

    update_state("idle")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [ASSET] %(message)s")
    run()
