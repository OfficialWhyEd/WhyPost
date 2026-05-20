from flask import Flask, jsonify, request
from pathlib import Path
import json, yaml, subprocess

BASE = Path(__file__).parent.parent
app = Flask(__name__)

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

@app.route("/claude", methods=["POST"])
def claude_chat():
    data = request.json
    prompt = data.get("prompt", "")
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", "sonnet"],
        capture_output=True, text=True, timeout=120, cwd=str(BASE)
    )
    return jsonify({"response": result.stdout.strip() or "Nessuna risposta"})

if __name__ == "__main__":
    app.run(port=5174, debug=False)
