from flask import Flask, jsonify, request
from pathlib import Path
import json, yaml, subprocess, sys

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


@app.route("/state")
def get_state():
    return jsonify(read_json(BASE / "state.json"))

@app.route("/queue")
def get_queue():
    return jsonify(read_json(BASE / "queue.json"))

@app.route("/config", methods=["GET"])
def get_config():
    return jsonify(read_yaml(BASE / "config.yaml"))

@app.route("/config", methods=["POST"])
def set_config():
    data = request.json
    (BASE / "config.yaml").write_text(yaml.dump(data, allow_unicode=True))
    return jsonify({"ok": True})

@app.route("/queue/add", methods=["POST"])
def add_to_queue():
    q = read_json(BASE / "queue.json")
    q.setdefault("videos", []).append(request.json)
    (BASE / "queue.json").write_text(json.dumps(q, indent=2, ensure_ascii=False))
    return jsonify({"ok": True})

@app.route("/memory/summary")
def memory_summary():
    try:
        from agents.memory import get_memory_summary, init_learning_db
        init_learning_db()
        return jsonify(get_memory_summary())
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route("/memory/lessons")
def memory_lessons():
    agent = request.args.get("agent", "SCRIPT")
    try:
        from agents.memory import get_lessons_for, init_learning_db
        init_learning_db()
        return jsonify(get_lessons_for(agent))
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route("/memory/correct", methods=["POST"])
def memory_correct():
    """Endpoint per salvare correzioni manuali dalla CHAT-AI."""
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

if __name__ == "__main__":
    # Init learning DB all'avvio
    try:
        from agents.memory import init_learning_db
        init_learning_db()
    except Exception:
        pass
    app.run(port=5174, debug=False)
