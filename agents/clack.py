# agents/clack.py — CLACK: Remotion render agent
import json
import logging
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).parent.parent
REMOTION_DIR = BASE / "remotion"
RENDERS_DIR = BASE / "data" / "renders"
ASSETS_DIR  = BASE / "data" / "assets"

logger = logging.getLogger(__name__)


def update_agent_state(status: str, extra: dict | None = None):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("CLACK", {})
    state["agents"]["CLACK"].update({
        "status": status,
        "last_run": datetime.now().isoformat(),
        **(extra or {}),
    })
    state["updated_at"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def render_video(video: dict) -> bool:
    vid_id  = video["id"]
    assets  = video.get("assets", {})
    script  = video.get("script", {})
    vtype   = video.get("video_type", "tech_news")

    audio_src = Path(assets.get("audio", "") or "")
    if not audio_src.exists() or audio_src.stat().st_size < 1000:
        logger.error(f"[CLACK] Audio mancante per {vid_id}")
        return False

    # Copia audio in public/ di Remotion
    public_audio = REMOTION_DIR / "public" / "audio.mp3"
    shutil.copy2(audio_src, public_audio)

    # Prepara props per il template
    props = _build_props(script, vtype)

    # Cartella output
    render_dir = RENDERS_DIR / vid_id
    render_dir.mkdir(parents=True, exist_ok=True)
    out_path = render_dir / "out.mp4"

    # Individua composition id dal tipo video
    composition_id = {
        "tech_news": "TechNews",
        "tutorial":  "TechNews",  # stesso template fino a Tutorial dedicato
        "best_of":   "TechNews",
    }.get(vtype, "TechNews")

    props_json = json.dumps(props, ensure_ascii=False)

    logger.info(f"[CLACK] Rendering {vid_id} ({composition_id}) → {out_path}")
    update_agent_state("running", {"rendering": vid_id})

    result = subprocess.run(
        [
            "npx", "remotion", "render",
            "src/index.ts", composition_id,
            "--props", props_json,
            "--output", str(out_path),
            "--concurrency=1",
            "--log", "error",
        ],
        cwd=str(REMOTION_DIR),
        capture_output=True,
        text=True,
        timeout=600,
    )

    if result.returncode != 0:
        logger.error(f"[CLACK] Render fallito:\n{result.stderr[-1000:]}")
        update_agent_state("error", {"rendering": None})
        return False

    if not out_path.exists() or out_path.stat().st_size < 10_000:
        logger.error(f"[CLACK] Output troppo piccolo o mancante: {out_path}")
        update_agent_state("error", {"rendering": None})
        return False

    logger.info(f"[CLACK] Render OK: {out_path} ({out_path.stat().st_size // 1024}KB)")
    update_agent_state("idle", {"rendering": None})
    return True


def _build_props(script: dict, vtype: str) -> dict:
    body = script.get("body", [])
    if not body:
        body = ["Contenuto non disponibile."]

    title_labels = {
        "tech_news": "TECH NEWS",
        "tutorial":  "TUTORIAL",
        "best_of":   "BEST OF",
    }

    return {
        "hook": script.get("hook", ""),
        "body": body,
        "cta":  script.get("cta", "Seguimi per altri video."),
        "titleCard": title_labels.get(vtype, "WHYPOST"),
        "audioFile": "audio.mp3",
        "durationPerSegment": 66,
    }


def run():
    queue_path = BASE / "queue.json"
    try:
        queue = json.loads(queue_path.read_text())
    except Exception:
        logger.error("[CLACK] queue.json non trovato")
        return

    rendered = 0
    for video in queue.get("videos", []):
        if video.get("status") != "assets_ready":
            continue

        video["status"] = "rendering"
        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

        ok = render_video(video)
        if ok:
            video["status"] = "rendered"
            video["rendered_at"] = datetime.now().isoformat()
            rendered += 1
        else:
            video["status"] = "render_failed"

        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

    if rendered:
        logger.info(f"[CLACK] {rendered} video renderizzati")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    run()
