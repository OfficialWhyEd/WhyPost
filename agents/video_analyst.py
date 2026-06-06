# agents/video_analyst.py
# CLACK Vision — scarica video virali, estrae frame, analizza con Claude.
# Output: pattern editoriali concreti salvati in clack_memory.json.
# Bibbia: ogni video analizzato deve insegnare qualcosa di applicabile immediatamente.

import json
import logging
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).parent.parent
MEMORY_PATH = BASE / "data" / "clack_memory.json"
FRAMES_DIR = BASE / "data" / "video_frames"

logger = logging.getLogger(__name__)


# ─── Frame extraction ──────────────────────────────────────────────────────────

def extract_frames(video_path: Path, out_dir: Path, n_frames: int = 6) -> list[Path]:
    """Estrae n_frames dal video equidistribuiti. Richiede ffmpeg."""
    out_dir.mkdir(parents=True, exist_ok=True)
    duration_result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)],
        capture_output=True, text=True
    )
    try:
        duration = float(duration_result.stdout.strip())
    except ValueError:
        duration = 30.0

    step = duration / (n_frames + 1)
    frames = []
    for i in range(1, n_frames + 1):
        ts = step * i
        out_frame = out_dir / f"frame_{i:02d}.jpg"
        result = subprocess.run(
            ["ffmpeg", "-ss", str(ts), "-i", str(video_path),
             "-vframes", "1", "-q:v", "2", str(out_frame), "-y"],
            capture_output=True, timeout=30
        )
        if result.returncode == 0 and out_frame.exists():
            frames.append(out_frame)

    return frames


def download_video(url: str, out_path: Path) -> bool:
    """Scarica il video con yt-dlp (solo fino a 60s per risparmio disco)."""
    try:
        result = subprocess.run(
            [
                "yt-dlp", url,
                "-o", str(out_path),
                "--format", "worst[ext=mp4]/worst",
                "--max-filesize", "50m",
                "--no-warnings",
                "--quiet",
            ],
            capture_output=True, text=True, timeout=120
        )
        return result.returncode == 0 and out_path.exists()
    except Exception as e:
        logger.warning(f"[VISION] Download fallito ({url}): {e}")
        return False


# ─── Claude vision analysis ────────────────────────────────────────────────────

def analyze_frames_with_claude(frames: list[Path], meta: dict) -> dict:
    """Analizza i frame con Claude vision per pattern editoriali."""
    if not frames:
        return {}

    # Costruisci il prompt con i path dei frame
    frame_args = []
    for f in frames:
        frame_args.extend(["--file", str(f)])

    meta_summary = (
        f"Titolo: {meta.get('title', 'N/A')}\n"
        f"Views: {meta.get('view_count', 0):,}\n"
        f"Likes: {meta.get('like_count', 0):,}\n"
        f"Durata: {meta.get('duration', 0)}s\n"
        f"Creator: {meta.get('uploader', 'N/A')}"
    )

    prompt = (
        "Sei CLACK, un editor video AI specializzato in TikTok e Instagram Reels virali.\n"
        "Analizza questi frame di un video virale e identifica i pattern editoriali.\n\n"
        f"METADATA:\n{meta_summary}\n\n"
        "Analizza:\n"
        "1. HOOK: Cosa succede nei primi 2 secondi? Come cattura l'attenzione?\n"
        "2. CAPTIONS: Stile, dimensione, colori, posizione, animazione visibile\n"
        "3. VISUAL ENERGY: Tagli rapidi, zoom, effetti, overlay\n"
        "4. COLORI: Palette dominante, contrasto, mood\n"
        "5. TESTO: Font, peso, dimensione, come è leggibile su mobile\n"
        "6. COSA REPLICARE: 3 cose concrete che Remotion può implementare\n\n"
        "Rispondi in JSON:\n"
        '{"hook_style": "...", "caption_style": {...}, "visual_energy": "...", '
        '"color_palette": [...], "replicable": [...], "score": 0-10}'
    )

    try:
        result = subprocess.run(
            ["claude", "-p", prompt] + frame_args,
            capture_output=True, text=True, timeout=90
        )
        if result.returncode == 0:
            text = result.stdout.strip()
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
    except Exception as e:
        logger.warning(f"[VISION] Claude vision: {e}")

    return {}


# ─── Meta-only analysis (no download) ─────────────────────────────────────────

def analyze_meta_only(meta: dict) -> dict:
    """Analisi leggera basata solo su metadata (senza scaricare il video)."""
    meta_summary = json.dumps(meta, ensure_ascii=False)
    try:
        result = subprocess.run(
            ["claude", "-p",
             "Sei CLACK. Analizza questi metadata di un video virale TikTok/IG.\n\n"
             f"{meta_summary}\n\n"
             "Cosa puoi dedurre su: hook strategy, durata ottimale, tipo di contenuto che funziona, "
             "energia richiesta, CTA probabile?\n"
             "Rispondi in JSON:\n"
             '{"hook_strategy": "...", "optimal_duration": 0, "content_type": "...", '
             '"energy_level": "low|medium|high", "cta_style": "...", "virality_factors": [...]}'],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            text = result.stdout.strip()
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
    except Exception as e:
        logger.warning(f"[VISION] meta analysis: {e}")
    return {}


# ─── Main entry point ──────────────────────────────────────────────────────────

def analyze_video(url: str, download: bool = False) -> bool:
    """
    Analizza un video virale e salva i pattern in clack_memory.json.
    Se download=True scarica il video e analizza i frame con Claude vision.
    Se download=False usa solo metadata (più veloce, meno preciso).
    """
    from agents.clack_research import load_memory, save_memory

    # Scarica metadata
    try:
        meta_result = subprocess.run(
            ["yt-dlp", "--dump-json", "--no-download", "--no-warnings", url],
            capture_output=True, text=True, timeout=30
        )
        if meta_result.returncode != 0:
            logger.warning(f"[VISION] yt-dlp metadata fallito: {url}")
            return False
        meta = json.loads(meta_result.stdout.strip().splitlines()[0])
    except Exception as e:
        logger.error(f"[VISION] Metadata error: {e}")
        return False

    structured_meta = {
        "title": meta.get("title", "")[:200],
        "duration": meta.get("duration", 0),
        "view_count": meta.get("view_count", 0),
        "like_count": meta.get("like_count", 0),
        "comment_count": meta.get("comment_count", 0),
        "description": meta.get("description", "")[:400],
        "tags": meta.get("tags", [])[:15],
        "uploader": meta.get("uploader", ""),
        "platform": meta.get("extractor", "unknown"),
        "url": url,
    }

    # Analisi
    if download:
        logger.info(f"[VISION] Download video per analisi frame: {url}")
        FRAMES_DIR.mkdir(parents=True, exist_ok=True)
        vid_path = FRAMES_DIR / f"tmp_{abs(hash(url))}.mp4"
        if download_video(url, vid_path):
            frames_dir = FRAMES_DIR / f"frames_{abs(hash(url))}"
            frames = extract_frames(vid_path, frames_dir, n_frames=6)
            analysis = analyze_frames_with_claude(frames, structured_meta)
            # Cleanup
            vid_path.unlink(missing_ok=True)
        else:
            logger.warning("[VISION] Download fallito, uso metadata only")
            analysis = analyze_meta_only(structured_meta)
    else:
        analysis = analyze_meta_only(structured_meta)

    # Salva in memoria
    mem = load_memory()
    existing_urls = {p.get("url") for p in mem.get("viral_patterns", [])}
    if url not in existing_urls:
        entry = {**structured_meta, "analysis": analysis, "analyzed_at": datetime.now().isoformat()}
        mem.setdefault("viral_patterns", []).append(entry)

        # Rigenera regole editoriali
        from agents.clack_research import derive_editorial_rules
        rules = derive_editorial_rules(mem["viral_patterns"])
        if rules:
            mem["editorial_rules"] = rules
            logger.info(f"[VISION] Regole editoriali aggiornate: {len(rules)}")

        save_memory(mem)
        logger.info(
            f"[VISION] Analizzato: {structured_meta['uploader']} "
            f"— {structured_meta['view_count']:,} views"
        )
        return True

    logger.info(f"[VISION] Già in memoria: {url}")
    return False


def batch_analyze(urls: list[str], download: bool = False) -> int:
    count = 0
    for url in urls:
        if analyze_video(url, download=download):
            count += 1
    return count


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [VISION] %(message)s")

    parser = argparse.ArgumentParser(description="CLACK Video Analyst")
    parser.add_argument("url", nargs="?", help="URL del video da analizzare")
    parser.add_argument("--download", action="store_true", help="Scarica il video per analisi frame (più precisa)")
    args = parser.parse_args()

    if args.url:
        ok = analyze_video(args.url, download=args.download)
        print("Analisi completata" if ok else "Analisi fallita o già presente")
    else:
        parser.print_help()
