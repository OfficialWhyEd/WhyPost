# agents/clack.py — CLACK: direttore creativo AI
#
# CLACK non è un renderer passivo. Ad ogni video:
#   1. Analizza video virali reali sul topic via yt-dlp
#   2. Cerca template/tecniche su GitHub, npm, HyperFrames registry
#   3. Decide il miglior motore di rendering (Remotion o HyperFrames)
#   4. Raffina stile, colori, energia in base a cosa funziona davvero
#   5. Impara da ogni render (successi e fallimenti) in clack_memory.json
#
# Renderer disponibili:
#   - Remotion (default): npx remotion render → WhyMultiTemplate + future compositions
#   - HyperFrames: bun run dev (~/Documents/HyperFrame) → HTML-based, accetta --variables JSON
#
import json
import logging
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).parent.parent
REMOTION_DIR  = BASE / "remotion"
RENDERS_DIR   = BASE / "data" / "renders"
ASSETS_DIR    = BASE / "data" / "assets"
HYPERFRAMES_DIR = Path.home() / "Documents" / "HyperFrame"

logger = logging.getLogger(__name__)

# ── Topic → visual style ─────────────────────────────────────────────────────

TOPIC_STYLE_MAP: dict[str, dict] = {
    # Tech / AI
    "ai":               {"accentColor": "oklch(72% 0.18 155)", "bgColor": "#060a08", "energyLevel": "high"},
    "machine learning": {"accentColor": "oklch(72% 0.18 155)", "bgColor": "#060a08", "energyLevel": "high"},
    "chatgpt":          {"accentColor": "oklch(72% 0.18 155)", "bgColor": "#060a08", "energyLevel": "high"},
    "gpt":              {"accentColor": "oklch(72% 0.18 155)", "bgColor": "#060a08", "energyLevel": "high"},
    "claude":           {"accentColor": "oklch(72% 0.18 155)", "bgColor": "#060a08", "energyLevel": "high"},
    "llm":              {"accentColor": "oklch(72% 0.18 155)", "bgColor": "#060a08", "energyLevel": "high"},
    "openai":           {"accentColor": "oklch(72% 0.18 155)", "bgColor": "#060a08", "energyLevel": "high"},
    # Apple / Design
    "apple":            {"accentColor": "oklch(75% 0.06 250)", "bgColor": "#08080c", "energyLevel": "low"},
    "iphone":           {"accentColor": "oklch(75% 0.06 250)", "bgColor": "#08080c", "energyLevel": "low"},
    "ipad":             {"accentColor": "oklch(75% 0.06 250)", "bgColor": "#08080c", "energyLevel": "low"},
    "mac":              {"accentColor": "oklch(75% 0.06 250)", "bgColor": "#08080c", "energyLevel": "low"},
    "design":           {"accentColor": "oklch(75% 0.06 250)", "bgColor": "#08080c", "energyLevel": "low"},
    # Finance / Crypto
    "crypto":           {"accentColor": "oklch(78% 0.16 55)",  "bgColor": "#090800", "energyLevel": "high"},
    "bitcoin":          {"accentColor": "oklch(78% 0.16 55)",  "bgColor": "#090800", "energyLevel": "high"},
    "ethereum":         {"accentColor": "oklch(78% 0.16 55)",  "bgColor": "#090800", "energyLevel": "high"},
    "finanza":          {"accentColor": "oklch(78% 0.16 55)",  "bgColor": "#090800", "energyLevel": "mid"},
    "soldi":            {"accentColor": "oklch(78% 0.16 55)",  "bgColor": "#090800", "energyLevel": "mid"},
    # Science / Space
    "scienza":          {"accentColor": "oklch(74% 0.14 200)", "bgColor": "#060a0c", "energyLevel": "mid"},
    "spazio":           {"accentColor": "oklch(68% 0.12 280)", "bgColor": "#06060c", "energyLevel": "mid"},
    "nasa":             {"accentColor": "oklch(68% 0.12 280)", "bgColor": "#06060c", "energyLevel": "mid"},
    "fisica":           {"accentColor": "oklch(68% 0.12 280)", "bgColor": "#06060c", "energyLevel": "mid"},
    # Health
    "salute":           {"accentColor": "oklch(74% 0.14 160)", "bgColor": "#060c08", "energyLevel": "low"},
    "medicina":         {"accentColor": "oklch(74% 0.14 160)", "bgColor": "#060c08", "energyLevel": "low"},
    # Sport
    "sport":            {"accentColor": "oklch(76% 0.18 40)",  "bgColor": "#0a0800", "energyLevel": "high"},
    "calcio":           {"accentColor": "oklch(76% 0.18 40)",  "bgColor": "#0a0800", "energyLevel": "high"},
    # Default
    "_default":         {"accentColor": "oklch(73% 0.14 158)", "bgColor": "#070709", "energyLevel": "mid"},
}


def _get_topic_style(topic: str) -> dict:
    if not topic:
        return TOPIC_STYLE_MAP["_default"]
    lower = topic.lower()
    for key, style in TOPIC_STYLE_MAP.items():
        if key != "_default" and key in lower:
            return style
    return TOPIC_STYLE_MAP["_default"]


# ── Viral analysis ────────────────────────────────────────────────────────────

def _analyze_viral_references(topic: str, vid_id: str) -> dict:
    """
    Scarica 1-2 video virali del topic via yt-dlp, estrae frame con ffmpeg,
    fa analizzare da Claude vision per capire editing, palette, energia.
    Ritorna insight da salvare in clack_memory.
    """
    cache_key = f"{topic[:40]}_{datetime.now().strftime('%Y%m')}"
    mem_path = BASE / "data" / "clack_memory.json"
    try:
        mem = json.loads(mem_path.read_text()) if mem_path.exists() else {}
    except Exception:
        mem = {}

    # Cache mensile per non abusare yt-dlp
    if cache_key in mem.get("viral_analysis", {}):
        logger.info(f"[CLACK] Viral cache hit: {topic[:30]}")
        return mem["viral_analysis"][cache_key]

    insights: dict = {"topic": topic, "analyzed_at": datetime.now().isoformat()}

    try:
        yt_dlp = shutil.which("yt-dlp")
        ffmpeg = shutil.which("ffmpeg")
        if not yt_dlp or not ffmpeg:
            return insights

        frames_dir = BASE / "data" / "viral_frames" / vid_id
        frames_dir.mkdir(parents=True, exist_ok=True)

        # Cerca video TikTok/IG virali sul topic
        search_query = f"ytsearch3:{topic} viral short 2025"
        dl_result = subprocess.run(
            [yt_dlp, "--no-playlist", "--skip-download",
             "--print", "%(id)s|%(title)s|%(view_count)s",
             "--match-filter", "view_count>500000",
             search_query],
            capture_output=True, text=True, timeout=30,
        )
        lines = [l for l in dl_result.stdout.strip().splitlines() if l]
        if not lines:
            return insights

        # Prende il più visto
        best = sorted(
            [ln.split("|") for ln in lines if len(ln.split("|")) == 3],
            key=lambda x: int(x[2]) if x[2].isdigit() else 0,
            reverse=True,
        )
        if not best:
            return insights

        yt_id, title, views = best[0]
        logger.info(f"[CLACK] Analisi viral: '{title[:50]}' ({views} views)")

        # Download solo i frame (no audio, max 30s)
        vid_tmp = frames_dir / "ref.mp4"
        subprocess.run(
            [yt_dlp, f"https://www.youtube.com/watch?v={yt_id}",
             "--output", str(vid_tmp),
             "--format", "bestvideo[height<=720][ext=mp4]/best[height<=720]",
             "--external-downloader-args", "ffmpeg:-t 30",
             "--quiet"],
            timeout=60, capture_output=True,
        )

        if vid_tmp.exists():
            # Estrai 6 frame rappresentativi
            subprocess.run(
                [ffmpeg, "-i", str(vid_tmp), "-vf", "fps=1/5,scale=540:-1",
                 "-frames:v", "6", str(frames_dir / "frame_%02d.jpg"), "-y", "-loglevel", "error"],
                timeout=20,
            )
            vid_tmp.unlink(missing_ok=True)

            # Analisi Claude vision via subprocess headless
            frame_files = sorted(frames_dir.glob("frame_*.jpg"))
            if frame_files:
                try:
                    analysis = _claude_vision_analysis(frame_files[:4], topic, title)
                    insights.update(analysis)
                except Exception as e:
                    logger.warning(f"[CLACK] Vision skip: {e}")

        insights["reference_title"] = title
        insights["reference_views"] = views

    except Exception as e:
        logger.warning(f"[CLACK] Viral analysis skip: {e}")

    # Salva in cache
    try:
        mem.setdefault("viral_analysis", {})[cache_key] = insights
        mem_path.write_text(json.dumps(mem, indent=2, ensure_ascii=False))
    except Exception:
        pass

    return insights


def _claude_vision_analysis(frame_files: list, topic: str, reference_title: str) -> dict:
    """
    Usa Claude headless (subprocess) per analizzare frame di video virali.
    Ritorna suggerimenti su palette, energia, stile editing.
    """
    import base64

    images_b64 = []
    for f in frame_files:
        try:
            data = base64.b64encode(f.read_bytes()).decode()
            images_b64.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": data}})
        except Exception:
            pass

    if not images_b64:
        return {}

    prompt = f"""Analizza questi frame di un video virale TikTok/Reels sul topic "{topic}" (titolo: "{reference_title}").

Rispondi SOLO con JSON valido, nessun testo prima o dopo:
{{
  "dominant_colors": ["#hex1", "#hex2"],
  "bg_style": "dark|light|gradient|minimal",
  "text_style": "bold_karaoke|subtitle|overlay|animated",
  "energy": "low|mid|high",
  "cut_pace": "slow|medium|fast",
  "hook_technique": "descrizione breve di come apre il video",
  "what_makes_it_viral": "1 frase su cosa funziona visivamente"
}}"""

    content = images_b64 + [{"type": "text", "text": prompt}]

    payload = json.dumps({
        "model": "claude-opus-4-7",
        "max_tokens": 300,
        "messages": [{"role": "user", "content": content}]
    })

    claude = shutil.which("claude") or "claude"
    result = subprocess.run(
        [claude, "--print", "--output-format", "json"],
        input=payload, capture_output=True, text=True, timeout=30,
    )

    try:
        raw = result.stdout.strip()
        # L'output di claude --output-format json ha il testo nella chiave result
        outer = json.loads(raw)
        text = outer.get("result", raw)
        # Estrai JSON dalla risposta
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0:
            return json.loads(text[start:end])
    except Exception:
        pass

    return {}


# ── Renderer selection ────────────────────────────────────────────────────────

def _select_renderer(video: dict, viral_insights: dict) -> str:
    """
    Decide quale motore usare per questo video.
    Ritorna: "remotion" | "hyperframes"

    HyperFrames è preferito quando:
    - Il video richiede transizioni shader complesse (energyLevel==high + cut_pace==fast)
    - Il tipo è "cinematic" o "data_viz"
    - HyperFrames CLI è disponibile (bun installato + package esiste)
    """
    vtype = video.get("video_type", "tech_news")
    energy = viral_insights.get("energy", "mid")
    cut_pace = viral_insights.get("cut_pace", "medium")

    # Verifica disponibilità HyperFrames
    bun_available = bool(shutil.which("bun"))
    hf_available = bun_available and (HYPERFRAMES_DIR / "package.json").exists()

    if not hf_available:
        return "remotion"

    # Usa HyperFrames per video cinematici o molto dinamici
    if vtype in ("cinematic", "data_viz"):
        logger.info(f"[CLACK] HyperFrames selezionato per tipo '{vtype}'")
        return "hyperframes"

    if energy == "high" and cut_pace == "fast":
        logger.info("[CLACK] HyperFrames selezionato per alta energia + ritmo veloce")
        return "hyperframes"

    return "remotion"


# ── Render engines ────────────────────────────────────────────────────────────

def _render_remotion(vid_id: str, composition_id: str, props: dict, out_path: Path) -> bool:
    props_json = json.dumps(props, ensure_ascii=False)
    logger.info(f"[CLACK] Remotion render: {composition_id} → {out_path.name}")

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
        logger.error(f"[CLACK] Remotion fallito:\n{result.stderr[-800:]}")
        return False

    return out_path.exists() and out_path.stat().st_size > 10_000


def _render_hyperframes(vid_id: str, props: dict, out_path: Path, composition: str | None = None) -> bool:
    """
    Render via HyperFrames CLI.
    hyperframes render --variables '{...}' --output out.mp4
    Usa `bun run dev` con i comandi HF se CLI non è nel PATH.
    """
    hf_bin = shutil.which("hyperframes")

    if not hf_bin:
        # Fallback: bun run dal package
        cli_pkg = HYPERFRAMES_DIR / "packages" / "cli"
        if not (cli_pkg / "package.json").exists():
            logger.warning("[CLACK] HyperFrames non disponibile, fallback Remotion")
            return False
        cmd_prefix = ["bun", "run", "dev", "--"]
        cwd = str(cli_pkg)
    else:
        cmd_prefix = [hf_bin]
        cwd = str(HYPERFRAMES_DIR)

    variables_json = json.dumps(props, ensure_ascii=False)

    cmd = cmd_prefix + [
        "render",
        "--variables", variables_json,
        "--output", str(out_path),
        "--quality", "high",
    ]
    if composition:
        cmd += ["--composition", composition]

    logger.info(f"[CLACK] HyperFrames render → {out_path.name}")

    result = subprocess.run(
        cmd, cwd=cwd,
        capture_output=True, text=True, timeout=900,
    )

    if result.returncode != 0:
        logger.error(f"[CLACK] HyperFrames fallito:\n{result.stderr[-800:]}")
        return False

    return out_path.exists() and out_path.stat().st_size > 10_000


# ── Main render orchestration ─────────────────────────────────────────────────

def render_video(video: dict) -> bool:
    vid_id = video["id"]
    assets = video.get("assets", {})
    script = video.get("script", {})
    vtype  = video.get("video_type", "tech_news")
    topic  = video.get("idea_title", script.get("title_card", ""))

    # Validazione audio
    audio_src = Path(assets.get("audio", "") or "")
    if not audio_src.exists() or audio_src.stat().st_size < 1000:
        logger.error(f"[CLACK] Audio mancante: {vid_id}")
        return False

    # ── Step 1: ricerca template e tecniche virali ──
    viral_insights: dict = {}
    if topic:
        try:
            from agents.web_search import search
            results = search(
                f"{topic} viral TikTok Reels editing template technique 2025",
                max_results=5,
            )
            logger.info(f"[CLACK] Web search '{topic[:30]}': {len(results)} risultati")

            # Cerca anche template Remotion/HyperFrames specifici
            tmpl_results = search(
                f"remotion template {topic} vertical video site:github.com",
                max_results=3,
            )
            if tmpl_results:
                logger.info(f"[CLACK] Template search: {len(tmpl_results)} candidati")
                try:
                    from agents.clack_research import load_memory, save_memory
                    mem = load_memory()
                    mem.setdefault("template_candidates", {})[topic[:60]] = {
                        "results": [{"title": r["title"], "url": r["url"]} for r in tmpl_results],
                        "searched_at": datetime.now().isoformat(),
                    }
                    save_memory(mem)
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"[CLACK] Web search skip: {e}")

        # ── Step 2: analisi video virali reali ──
        try:
            viral_insights = _analyze_viral_references(topic, vid_id)
            if viral_insights.get("what_makes_it_viral"):
                logger.info(f"[CLACK] Viral insight: {viral_insights['what_makes_it_viral'][:80]}")
        except Exception as e:
            logger.warning(f"[CLACK] Viral analysis skip: {e}")

    # ── Step 3: selezione renderer ──
    renderer = _select_renderer(video, viral_insights)

    # ── Step 4: costruisci props (stile raffinato con viral insights) ──
    words_path = assets.get("words")
    props = _build_props(script, vtype, words_path, topic=topic, viral_insights=viral_insights)

    render_dir = RENDERS_DIR / vid_id
    render_dir.mkdir(parents=True, exist_ok=True)
    out_path = render_dir / "out.mp4"

    # Copia audio nel public/ Remotion (serve anche per HyperFrames come fallback)
    public_audio = REMOTION_DIR / "public" / "audio.mp3"
    shutil.copy2(audio_src, public_audio)

    update_agent_state("running", {"rendering": vid_id, "renderer": renderer})

    # ── Step 5: render ──
    ok = False

    if renderer == "hyperframes":
        ok = _render_hyperframes(vid_id, props, out_path)
        if not ok:
            logger.warning("[CLACK] HyperFrames fallito, fallback Remotion")
            renderer = "remotion"

    if renderer == "remotion" or not ok:
        composition_id = _pick_remotion_composition(vtype, viral_insights)
        ok = _render_remotion(vid_id, composition_id, props, out_path)

    if ok:
        video["render_engine"] = renderer
        video["viral_insights"] = {
            k: v for k, v in viral_insights.items()
            if k in ("energy", "cut_pace", "what_makes_it_viral", "hook_technique")
        }
        logger.info(f"[CLACK] OK [{renderer}]: {out_path} ({out_path.stat().st_size // 1024}KB)")
    else:
        logger.error(f"[CLACK] Render fallito su tutti i renderer: {vid_id}")

    update_agent_state("idle", {"rendering": None})
    return ok


def _pick_remotion_composition(vtype: str, viral_insights: dict) -> str:
    """
    Sceglie la composition Remotion più adatta in base al tipo di video.

    Mapping template:
      tutorial  → WhyTutorialTemplate  (how-to step-by-step, educational)
      best_of   → WhyBestOfTemplate    (Top N countdown, energetico)
      tech_news → WhyMultiTemplate     (default news + karaoke)

    Future compositions:
      "WhyKinetic" → testo puramente cinetico, zero B-roll
      "WhyData"    → grafici e numeri animati
      "WhyCinema"  → B-roll full-screen con testo overlay minimale
    """
    composition_map = {
        "tech_news": "WhyMultiTemplate",
        "tutorial":  "WhyTutorialTemplate",
        "best_of":   "WhyBestOfTemplate",
        "kinetic":   "WhyMultiTemplate",  # → WhyKinetic quando disponibile
        "data_viz":  "WhyMultiTemplate",  # → WhyData quando disponibile
        "cinematic": "WhyMultiTemplate",  # → WhyCinema quando disponibile
    }
    return composition_map.get(vtype, "WhyMultiTemplate")


def _build_props(
    script: dict,
    vtype: str,
    words_path: str | None = None,
    topic: str = "",
    viral_insights: dict | None = None,
) -> dict:
    body = script.get("body", []) or ["Contenuto non disponibile."]

    title_labels = {
        "tech_news": "TECH NEWS",
        "tutorial":  "TUTORIAL",
        "best_of":   "BEST OF",
        "kinetic":   "KINETIC",
        "data_viz":  "DATA",
        "cinematic": "STORY",
    }

    words: list = []
    total_duration_frames = 510

    if words_path:
        try:
            words = json.loads(Path(words_path).read_text())
            if words:
                last_ms = words[-1]["end_ms"]
                total_duration_frames = int((last_ms + 2000) * 30 / 1000)
                logger.info(f"[CLACK] Karaoke: {len(words)} parole, {total_duration_frames} frames")
        except Exception as e:
            logger.warning(f"[CLACK] words.json non leggibile: {e}")

    # Stile base dal topic
    style = _get_topic_style(topic)

    # Raffina energyLevel con viral insights reali
    if viral_insights:
        vi_energy = viral_insights.get("energy")
        vi_pace   = viral_insights.get("cut_pace")
        if vi_energy and vi_pace:
            # Se i video virali del topic sono tutti "high + fast", adottiamo quel livello
            if vi_energy == "high" and vi_pace == "fast":
                style = {**style, "energyLevel": "high"}
            elif vi_energy == "low" and vi_pace == "slow":
                style = {**style, "energyLevel": "low"}

    # Default segment duration per template type
    # tutorial: 90f (più lento, educational)
    # best_of:  72f (energetico countdown)
    # tech_news: 66f (default)
    segment_duration_map = {
        "tutorial": 90,
        "best_of":  72,
    }
    duration_per_segment = segment_duration_map.get(vtype, 66)

    return {
        "hook":               script.get("hook", ""),
        "body":               body,
        "cta":                script.get("cta", "Seguimi per altri video."),
        "titleCard":          title_labels.get(vtype, "WHYPOST"),
        "audioFile":          "audio.mp3",
        "durationPerSegment": duration_per_segment,
        "words":              words,
        "totalDurationFrames": total_duration_frames,
        "accentColor":        style["accentColor"],
        "bgColor":            style["bgColor"],
        "energyLevel":        style.get("energyLevel", "mid"),
    }


# ── Agent state ───────────────────────────────────────────────────────────────

def update_agent_state(status: str, extra: dict | None = None):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("CLACK", {})
    state["agents"]["CLACK"].update({
        "status":   status,
        "last_run": datetime.now().isoformat(),
        **(extra or {}),
    })
    state["updated_at"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False))


# ── Run ───────────────────────────────────────────────────────────────────────

def run():
    # Boot: research + template library sync
    try:
        from agents.clack_research import run_research, get_editorial_rules
        run_research()
        rules = get_editorial_rules()
        if rules:
            logger.info(f"[CLACK] {len(rules)} regole editoriali attive")
    except Exception as e:
        logger.warning(f"[CLACK] Research skip: {e}")

    try:
        from agents.template_library import sync_from_github
        sync_from_github()
    except Exception as e:
        logger.warning(f"[CLACK] Template library skip: {e}")

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
        renderer = video.get("render_engine", "remotion")

        if ok:
            video["status"] = "rendered"
            video["rendered_at"] = datetime.now().isoformat()
            rendered += 1
            try:
                from agents.template_library import record_render
                record_render(
                    template_id=f"{renderer}/{video.get('video_type', 'tech_news')}",
                    success=True,
                )
            except Exception:
                pass
        else:
            video["status"] = "render_failed"
            try:
                from agents.template_library import record_render
                record_render(
                    template_id=f"{renderer}/{video.get('video_type', 'tech_news')}",
                    success=False,
                )
            except Exception:
                pass

        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

    if rendered:
        logger.info(f"[CLACK] {rendered} video renderizzati")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    run()
