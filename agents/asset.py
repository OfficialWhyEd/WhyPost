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

async def generate_tts(text: str, voice: str, output_path: Path) -> list:
    """
    Genera audio TTS e restituisce word timestamps [{word, start_ms, end_ms}].
    edge-tts non emette più WordBoundary — usa SentenceBoundary e distribuisce
    i timestamp proporzionalmente tra le parole di ogni frase.
    """
    try:
        communicate = edge_tts.Communicate(text, voice)
        sentences = []

        with open(str(output_path), "wb") as f:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "SentenceBoundary":
                    sentences.append(chunk)

        if not output_path.exists() or output_path.stat().st_size < 1000:
            logger.error(f"TTS ha prodotto file vuoto: {output_path}")
            output_path.unlink(missing_ok=True)
            return []

        # Distribuisce timestamp parole proporzionalmente in ogni frase
        words = []
        for sent in sentences:
            sent_start_ms = sent["offset"] // 10_000
            sent_dur_ms = sent["duration"] // 10_000
            sent_words = sent["text"].split()
            n = len(sent_words)
            if n == 0:
                continue
            ms_per_word = sent_dur_ms / n
            for i, word in enumerate(sent_words):
                words.append({
                    "word": word,
                    "start_ms": int(sent_start_ms + i * ms_per_word),
                    "end_ms": int(sent_start_ms + (i + 1) * ms_per_word),
                })

        logger.info(f"TTS OK: {len(words)} parole ({len(sentences)} frasi) con timestamp")
        return words
    except Exception as e:
        logger.error(f"TTS error: {e}")
        output_path.unlink(missing_ok=True)
        return []

def build_tts_text(script: dict) -> str:
    parts = []
    if script.get("hook"):
        parts.append(script["hook"])
    parts.extend(script.get("body", []))
    if script.get("cta"):
        parts.append(script["cta"])
    return ". ".join(p.strip().rstrip(".") for p in parts if p)

def fetch_broll(query: str, vid_dir: Path, count: int = 3) -> list:
    api_key = os.getenv("PEXELS_API_KEY", "")
    if not api_key:
        logger.warning("PEXELS_API_KEY non impostata — provo Pixabay come fallback")
        return fetch_pixabay_broll(query, vid_dir, count)
    headers = {"Authorization": api_key}
    url = f"https://api.pexels.com/videos/search?query={query}&per_page={count}&orientation=portrait&size=medium"
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        videos = resp.json().get("videos", [])
        if not videos:
            logger.warning("Pexels: 0 risultati — provo Pixabay come fallback")
            return fetch_pixabay_broll(query, vid_dir, count)
        paths = []
        for v in videos[:count]:
            files = sorted(v.get("video_files", []), key=lambda f: f.get("width", 0))
            if not files:
                continue
            video_url = files[0]["link"]
            fname = vid_dir / f"broll_{v['id']}.mp4"
            if not fname.exists():
                with requests.get(video_url, stream=True, timeout=60) as r:
                    fname.write_bytes(r.content)
                logger.info(f"B-roll scaricato (Pexels): {fname.name}")
            paths.append(str(fname))
        return paths
    except Exception as e:
        logger.error(f"Pexels error: {e} — provo Pixabay come fallback")
        return fetch_pixabay_broll(query, vid_dir, count)


def fetch_pixabay_broll(query: str, vid_dir: Path, count: int = 3) -> list:
    """
    Scarica B-roll da Pixabay come fonte secondaria.
    Richiede PIXABAY_API_KEY in .env. Se non disponibile, logga warning e ritorna [].
    """
    api_key = os.getenv("PIXABAY_API_KEY", "")
    if not api_key:
        logger.warning("PIXABAY_API_KEY non impostata — B-roll saltato (nessuna fonte disponibile)")
        return []
    url = (
        f"https://pixabay.com/api/videos/"
        f"?key={api_key}&q={requests.utils.quote(query)}"
        f"&video_type=film&per_page={count}"
    )
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        hits = resp.json().get("hits", [])
        if not hits:
            logger.warning(f"Pixabay: 0 risultati per '{query}' — B-roll saltato")
            return []
        paths = []
        for i, hit in enumerate(hits[:count]):
            videos_map = hit.get("videos", {})
            # Preferisce large, poi medium, poi il primo disponibile
            video_info = (
                videos_map.get("large")
                or videos_map.get("medium")
                or next(iter(videos_map.values()), None)
            )
            if not video_info or not video_info.get("url"):
                continue
            video_url = video_info["url"]
            fname = vid_dir / f"broll_px_{hit.get('id', i)}.mp4"
            if not fname.exists():
                with requests.get(video_url, stream=True, timeout=60) as r:
                    fname.write_bytes(r.content)
                logger.info(f"B-roll scaricato (Pixabay): {fname.name}")
            paths.append(str(fname))
        return paths
    except Exception as e:
        logger.error(f"Pixabay error: {e} — B-roll saltato")
        return []

def generate_captions(audio_path: Path, output_dir: Path) -> list:
    """
    Genera word-level captions via whisper.
    Chiama: whisper audio.mp3 --model base --output_format json --output_dir DIR
    Ritorna lista di {"word": str, "start_ms": int, "end_ms": int}.
    Se whisper non è disponibile o fallisce, ritorna lista vuota (il video usa
    già i timestamp edge-tts da words.json).
    """
    # Cerca whisper nel PATH (sia openai-whisper che whisper-cpp)
    whisper_bins = ["whisper", "whisper-cli", "whisper-cpp"]
    whisper_bin = None
    for bin_name in whisper_bins:
        try:
            result = subprocess.run(
                ["which", bin_name], capture_output=True, text=True
            )
            if result.returncode == 0 and result.stdout.strip():
                whisper_bin = bin_name
                break
        except Exception:
            continue

    if whisper_bin is None:
        logger.warning("[ASSET] whisper non trovato nel PATH — captions whisper saltate")
        return []

    try:
        cmd = [
            whisper_bin,
            str(audio_path),
            "--model", "base",
            "--output_format", "json",
            "--output_dir", str(output_dir),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if result.returncode != 0:
            logger.warning(f"[ASSET] whisper exit {result.returncode}: {result.stderr[:300]}")
            return []
    except FileNotFoundError:
        logger.warning("[ASSET] whisper non trovato — captions whisper saltate")
        return []
    except subprocess.TimeoutExpired:
        logger.warning("[ASSET] whisper timeout — captions whisper saltate")
        return []
    except Exception as e:
        logger.warning(f"[ASSET] whisper errore inatteso: {e}")
        return []

    # Il file JSON prodotto da whisper si chiama come l'audio senza estensione
    json_path = output_dir / (audio_path.stem + ".json")
    if not json_path.exists():
        logger.warning(f"[ASSET] Output JSON whisper non trovato: {json_path}")
        return []

    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning(f"[ASSET] Errore parsing JSON whisper: {e}")
        return []

    words = []
    for segment in data.get("segments", []):
        for w in segment.get("words", []):
            word_text = w.get("word", "").strip()
            if not word_text:
                continue
            words.append({
                "word": word_text,
                "start_ms": int(float(w.get("start", 0)) * 1000),
                "end_ms": int(float(w.get("end", 0)) * 1000),
            })

    if words:
        logger.info(f"[ASSET] Captions whisper OK: {len(words)} parole")
    else:
        logger.warning("[ASSET] whisper ha prodotto 0 parole — captions saltate")

    return words

def process_video(video: dict, cfg: dict) -> dict:
    vid_id = video["id"]
    lang = video.get("language", "it")
    voice = cfg.get("tts", {}).get("voice_it", "it-IT-IsabellaNeural") if lang == "it" \
        else cfg.get("tts", {}).get("voice_en", "en-US-JennyNeural")

    vid_dir = ASSETS_DIR / vid_id
    vid_dir.mkdir(parents=True, exist_ok=True)

    script = video.get("script", {})
    tts_text = build_tts_text(script)

    # Pre-flight memory check
    from agents.memory import check_before_action, remember_error, remember_success, init_learning_db
    init_learning_db()
    blocked, reason, lesson = check_before_action("ASSET", "tts", {"voice": voice, "lang": lang})
    if blocked:
        logger.error(f"[MEMORY BLOCK] TTS bloccato: {reason}")
        return {"audio": None, "captions": None, "broll": [], "tts_text": tts_text}

    # TTS
    audio_path = vid_dir / "audio.mp3"
    words = asyncio.run(generate_tts(tts_text, voice, audio_path))
    tts_ok = len(words) > 0
    if tts_ok:
        words_path = vid_dir / "words.json"
        words_path.write_text(json.dumps(words, ensure_ascii=False))
        logger.info(f"TTS OK: {len(words)} parole → {words_path}")
        remember_success("ASSET", "tts_ok")
    else:
        logger.error(f"TTS fallito per {vid_id}")
        remember_error("ASSET", "tts_fail", f"edge-tts fallito (voice={voice})", "Aggiorna edge-tts: pip install --upgrade edge-tts")

    # Captions via whisper (sovrascrive words.json se produce risultati migliori)
    if tts_ok and audio_path.exists():
        whisper_words = generate_captions(audio_path, vid_dir)
        if whisper_words:
            words_path = vid_dir / "words.json"
            words_path.write_text(json.dumps(whisper_words, ensure_ascii=False))
            logger.info(f"[ASSET] words.json aggiornato con timestamp whisper: {len(whisper_words)} parole")

    # B-roll
    search_query = video.get("idea_title", script.get("title_card", "technology"))[:50]
    broll = fetch_broll(search_query, vid_dir, count=3)

    words_path = vid_dir / "words.json"
    return {
        "audio": str(audio_path) if tts_ok else None,
        "words": str(words_path) if (tts_ok and words_path.exists()) else None,
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
        # Processa "scripted" e "needs_fix" se l'audio è mancante
        if video.get("status") == "needs_fix":
            vid_dir = ASSETS_DIR / video["id"]
            audio = vid_dir / "audio.mp3"
            words = vid_dir / "words.json"
            if audio.exists() and audio.stat().st_size > 1000 and words.exists():
                continue  # audio + parole ok, salta
        elif video.get("status") != "scripted":
            continue
        logger.info(f"Processing assets: {video['id']}")
        assets = process_video(video, cfg)
        video["assets"] = assets
        # Avanza solo se TTS ha prodotto audio valido
        if assets.get("audio"):
            video["status"] = "assets_ready"
            processed += 1
        else:
            video["status"] = "needs_fix"
            logger.warning(f"ASSET: TTS fallito per {video['id']} — rimane needs_fix")

    if processed > 0:
        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))
        logger.info(f"ASSET: {processed} video processati")

    update_state("idle")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [ASSET] %(message)s")
    run()
