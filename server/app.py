from flask import Flask, jsonify, request, send_file
from pathlib import Path
import json, yaml, subprocess, sys, glob

BASE = Path(__file__).parent.parent
sys.path.insert(0, str(BASE))

app = Flask(__name__)

# Parole chiave che segnalano una correzione utente nella chat
CORRECTION_SIGNALS = [
    "non farlo", "non fare", "stop", "sbagliato", "errore", "correggi",
    "non usare", "evita", "mai più", "non voglio", "cambia", "ricorda che",
    "wrong", "never", "stop doing", "don't", "fix this", "remember that",
    "non devi", "devi smettere", "basta con", "troppo", "non mi piace"
]

def read_json(path):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return {}

def read_yaml(path):
    try:
        return yaml.safe_load(Path(path).read_text())
    except Exception:
        return {}

def detect_correction(user_text: str) -> bool:
    lower = user_text.lower()
    return any(signal in lower for signal in CORRECTION_SIGNALS)

def extract_agent_from_text(text: str) -> str:
    """Cerca quale agente è menzionato nel testo della correzione."""
    agents = ["SCRIPT", "ASSET", "EXEL", "SAFETY", "PUBLISHER", "CLACK", "TELEMETRY", "OPUS", "MAIN"]
    lower = text.lower()
    for a in agents:
        if a.lower() in lower:
            return a
    return "ALL"


@app.route("/api/state")
@app.route("/state")
def get_state():
    return jsonify(read_json(BASE / "state.json"))

@app.route("/api/queue")
@app.route("/queue")
def get_queue():
    return jsonify(read_json(BASE / "queue.json"))

@app.route("/api/config", methods=["GET"])
@app.route("/config", methods=["GET"])
def get_config():
    return jsonify(read_yaml(BASE / "config.yaml"))

@app.route("/api/config", methods=["POST"])
@app.route("/config", methods=["POST"])
def set_config():
    data = request.json
    (BASE / "config.yaml").write_text(yaml.dump(data, allow_unicode=True))
    return jsonify({"ok": True})

@app.route("/api/queue/add", methods=["POST"])
@app.route("/queue/add", methods=["POST"])
def add_to_queue():
    q = read_json(BASE / "queue.json")
    q.setdefault("videos", []).append(request.json)
    (BASE / "queue.json").write_text(json.dumps(q, indent=2, ensure_ascii=False))
    return jsonify({"ok": True})

@app.route("/api/memory/summary")
@app.route("/memory/summary")
def memory_summary():
    try:
        from agents.memory import get_memory_summary, init_learning_db
        init_learning_db()
        return jsonify(get_memory_summary())
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route("/api/memory/lessons")
@app.route("/memory/lessons")
def memory_lessons():
    agent = request.args.get("agent", "SCRIPT")
    try:
        from agents.memory import get_lessons_for, init_learning_db
        init_learning_db()
        return jsonify(get_lessons_for(agent))
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route("/api/memory/correct", methods=["POST"])
@app.route("/memory/correct", methods=["POST"])
def memory_correct():
    data = request.json
    text = data.get("text", "")
    agent = data.get("agent", "ALL")
    if not text:
        return jsonify({"ok": False, "error": "text required"})
    try:
        from agents.memory import remember_correction, init_learning_db
        init_learning_db()
        remember_correction(text, agent)
        return jsonify({"ok": True, "saved": text[:80]})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

@app.route("/api/run", methods=["POST"])
def run_pipeline():
    subprocess.Popen(
        [sys.executable, str(BASE / "agents" / "main.py"), "check_buffer"],
        cwd=str(BASE)
    )
    return jsonify({"ok": True, "message": "pipeline avviata"})

@app.route("/api/claude", methods=["POST"])
@app.route("/claude", methods=["POST"])
def claude_chat():
    data = request.json
    user_input = data.get("user_input", "")  # testo originale utente (senza il contesto sistema)
    prompt = data.get("prompt", "")

    # Auto-detect correzioni dall'utente e salvarle in memoria
    if user_input and detect_correction(user_input):
        try:
            from agents.memory import remember_correction, init_learning_db
            init_learning_db()
            agent = extract_agent_from_text(user_input)
            remember_correction(user_input, agent, context={"source": "chat_ai"})
        except Exception:
            pass

    result = subprocess.run(
        ["claude", "-p", prompt, "--model", "sonnet"],
        capture_output=True, text=True, timeout=130, cwd=str(BASE)
    )
    response = result.stdout.strip() or "Nessuna risposta"

    return jsonify({"response": response})

@app.route("/video/outcome", methods=["POST"])
def video_outcome():
    """Chiamato dopo ogni pubblicazione — il sistema impara dai risultati."""
    data = request.json
    try:
        from agents.memory import learn_from_video, init_learning_db
        init_learning_db()
        score = learn_from_video(
            video_id=data["video_id"],
            template=data.get("template", "unknown"),
            topic=data.get("topic", ""),
            language=data.get("language", "it"),
            hook_style=data.get("hook_style", ""),
            duration_est=data.get("duration_est", 0),
            platform=data.get("platform", "instagram"),
            views=data.get("views", 0),
            likes=data.get("likes", 0),
            comments=data.get("comments", 0),
            shares=data.get("shares", 0),
        )
        return jsonify({"ok": True, "outcome_score": score})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

# ── VIDEO PREVIEW ENDPOINTS ────────────────────────────────────────────────

def find_video_in_queue(vid_id: str) -> dict | None:
    q = read_json(BASE / "queue.json")
    for v in q.get("videos", []):
        if v.get("id") == vid_id:
            return v
    return None

def save_queue(q: dict):
    (BASE / "queue.json").write_text(json.dumps(q, indent=2, ensure_ascii=False))

@app.route("/video/<vid_id>/detail")
def video_detail(vid_id):
    v = find_video_in_queue(vid_id)
    if not v:
        return jsonify({"error": "video not found"}), 404

    # Try to attach render path if a .mp4 exists
    renders_dir = BASE / "data" / "renders" / vid_id
    render_path = None
    if renders_dir.exists():
        mp4s = list(renders_dir.glob("*.mp4"))
        if mp4s:
            render_path = str(mp4s[0])

    result = dict(v)
    result["render_path"] = render_path
    return jsonify(result)

@app.route("/video/<vid_id>/audio")
def video_audio(vid_id):
    audio = BASE / "data" / "assets" / vid_id / "audio.mp3"
    if not audio.exists():
        return jsonify({"error": "audio not found"}), 404
    return send_file(str(audio), mimetype="audio/mpeg")

@app.route("/video/<vid_id>/render")
def video_render_file(vid_id):
    renders_dir = BASE / "data" / "renders" / vid_id
    mp4s = list(renders_dir.glob("*.mp4")) if renders_dir.exists() else []
    if not mp4s:
        return jsonify({"error": "render not found"}), 404
    return send_file(str(mp4s[0]), mimetype="video/mp4")

@app.route("/video/<vid_id>/approve", methods=["POST"])
def video_approve(vid_id):
    q = read_json(BASE / "queue.json")
    changed = False
    for v in q.get("videos", []):
        if v.get("id") == vid_id:
            v["status"] = "ready"
            v["approved_at"] = __import__("datetime").datetime.now().isoformat()
            data = request.json or {}
            if data.get("note"):
                v["note"] = data["note"]
            changed = True
    if not changed:
        return jsonify({"ok": False, "error": "video not found"}), 404
    save_queue(q)
    return jsonify({"ok": True})

@app.route("/video/<vid_id>/reject", methods=["POST"])
def video_reject(vid_id):
    q = read_json(BASE / "queue.json")
    changed = False
    for v in q.get("videos", []):
        if v.get("id") == vid_id:
            v["status"] = "needs_fix"
            v["rejected_at"] = __import__("datetime").datetime.now().isoformat()
            data = request.json or {}
            if data.get("note"):
                v["fix_note"] = data["note"]
                # Save rejection as a correction in memory
                try:
                    from agents.memory import remember_correction, init_learning_db
                    init_learning_db()
                    remember_correction(data["note"], "ALL", {"source": "preview_reject", "video_id": vid_id})
                except Exception:
                    pass
            changed = True
    if not changed:
        return jsonify({"ok": False, "error": "video not found"}), 404
    save_queue(q)
    return jsonify({"ok": True})

# ── END VIDEO PREVIEW ────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Init learning DB all'avvio
    try:
        from agents.memory import init_learning_db
        init_learning_db()
    except Exception:
        pass
    app.run(port=5174, debug=False)
