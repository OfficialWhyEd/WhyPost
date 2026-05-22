from flask import Flask, jsonify, request, send_file
from pathlib import Path
from datetime import datetime
import json, os, yaml, subprocess, sys, glob, uuid


BASE = Path(__file__).parent.parent
sys.path.insert(0, str(BASE))

# Carica .env se presente
_env_path = BASE / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

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
            v["approved_at"] = datetime.now().isoformat()
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
            v["rejected_at"] = datetime.now().isoformat()
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

# ── CLACK RESEARCH ──────────────────────────────────────────────────────────

@app.route("/api/clack/memory")
def clack_memory():
    try:
        from agents.clack_research import load_memory
        return jsonify(load_memory())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/clack/add-video", methods=["POST"])
def clack_add_video():
    """WhyChat manda URL TikTok/IG virale. download=true per analisi frame con Claude vision."""
    url = (request.json or {}).get("url", "").strip()
    download = (request.json or {}).get("download", False)
    if not url:
        return jsonify({"ok": False, "error": "url required"}), 400

    script = str(BASE / "agents" / "video_analyst.py")
    args = [sys.executable, script, url]
    if download:
        args.append("--download")
    subprocess.Popen(args, cwd=str(BASE))
    return jsonify({"ok": True, "message": f"Analisi avviata per: {url}"})

@app.route("/api/schedule")
def get_schedule():
    """Calendario pubblicazioni — Google Calendar o fallback locale."""
    try:
        from agents.calendar_agent import get_local_schedule
        return jsonify({"events": get_local_schedule()})
    except Exception as e:
        return jsonify({"error": str(e), "events": []}), 500

@app.route("/api/schedule/add", methods=["POST"])
def schedule_video():
    """Schedula un video: aggiunge evento Google Calendar."""
    data = request.json or {}
    try:
        from agents.calendar_agent import add_publish_event
        from datetime import datetime
        pub_at = datetime.fromisoformat(data["publish_at"])
        ok = add_publish_event(
            video_id=data.get("video_id", ""),
            title=data.get("title", "Video"),
            platform=data.get("platform", "instagram"),
            publish_at=pub_at,
            hook=data.get("hook", ""),
        )
        return jsonify({"ok": True, "gcal": ok})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/trends")
def get_trends():
    """Argomenti trending per WhyChat — base per orchestrazione contenuti."""
    lang = request.args.get("lang", "it")
    count = int(request.args.get("count", "10"))
    try:
        from agents.web_search import get_trending_topics
        topics = get_trending_topics(lang=lang, count=count)
        return jsonify({"topics": topics, "lang": lang, "count": len(topics)})
    except Exception as e:
        return jsonify({"error": str(e), "topics": []}), 500

@app.route("/api/clack/research", methods=["POST"])
def clack_research():
    """Forza un ciclo di ricerca template GitHub + analisi pattern."""
    force = (request.json or {}).get("force", False)
    args = [sys.executable, str(BASE / "agents" / "clack_research.py")]
    if force:
        args.append("--force")
    subprocess.Popen(args, cwd=str(BASE))
    return jsonify({"ok": True, "message": "Research avviato"})


@app.route("/api/clack/feed")
def clack_feed_get():
    """Ritorna il feed permanente di messaggi CLACK Director."""
    feed_path = BASE / "data" / "clack_feed.json"
    try:
        feed = json.loads(feed_path.read_text()) if feed_path.exists() else {"messages": []}
        # Mark as read
        changed = False
        for m in feed.get("messages", []):
            if m.get("unread"):
                m["unread"] = False
                changed = True
        if changed:
            feed_path.write_text(json.dumps(feed, indent=2, ensure_ascii=False))
        return jsonify(feed)
    except Exception as e:
        return jsonify({"messages": [], "error": str(e)})


@app.route("/api/clack/feed", methods=["POST"])
def clack_feed_post():
    """
    Utente manda un messaggio a CLACK (testo o URL da analizzare).
    CLACK risponde in background aggiungendo al feed.
    """
    data = request.json or {}
    text = data.get("text", "").strip()
    url  = data.get("url", "").strip()
    if not text:
        return jsonify({"ok": False, "error": "text required"}), 400

    feed_path = BASE / "data" / "clack_feed.json"
    try:
        feed = json.loads(feed_path.read_text()) if feed_path.exists() else {"messages": []}
    except Exception:
        feed = {"messages": []}

    # Aggiungi messaggio utente
    user_msg = {
        "id": str(uuid.uuid4()),
        "type": "user",
        "from": "user",
        "text": text,
        "timestamp": datetime.now().isoformat(),
    }
    if url:
        user_msg["url"] = url
    feed["messages"].append(user_msg)
    feed_path.write_text(json.dumps(feed, indent=2, ensure_ascii=False))

    # Lancia analisi CLACK in background
    script = str(BASE / "agents" / "clack_director.py")
    args = [sys.executable, script, "--user-message", text]
    if url:
        args += ["--url", url]
    subprocess.Popen(args, cwd=str(BASE))

    return jsonify({"ok": True})

# ── END CLACK RESEARCH ───────────────────────────────────────────────────────

@app.route("/api/plan-week", methods=["POST"])
def plan_week():
    """
    Riceve {days: [{date, topic}]} e aggiorna config.yaml daily_topics.
    Poi avvia check_buffer per ogni giorno con topic mancante nel buffer.
    """
    data = request.json or {}
    days = data.get("days", [])   # [{date: "YYYY-MM-DD", topic: "..."}]
    if not days:
        return jsonify({"ok": False, "error": "days required"})

    # Mappa date → topic e aggiorna config.yaml daily_topics
    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    try:
        cfg_path = BASE / "config.yaml"
        import yaml as _yaml
        cfg = _yaml.safe_load(cfg_path.read_text()) or {}
        cfg.setdefault("daily_topics", {})
        for entry in days:
            topic = entry.get("topic", "").strip()
            date_str = entry.get("date", "")
            if not topic or not date_str:
                continue
            try:
                from datetime import date as _date
                d = _date.fromisoformat(date_str)
                key = day_names[d.weekday()]
                cfg["daily_topics"][key] = topic
            except Exception:
                pass
        cfg_path.write_text(_yaml.dump(cfg, allow_unicode=True))
    except Exception as e:
        return jsonify({"ok": False, "error": f"config update: {e}"}), 500

    # Avvia pipeline in background per riempire buffer
    subprocess.Popen(
        [sys.executable, str(BASE / "agents" / "main.py"), "check_buffer"],
        cwd=str(BASE)
    )
    return jsonify({"ok": True, "message": f"{len(days)} giorni pianificati, pipeline avviata"})

# ── OAUTH FLOWS (Google only — IG/TikTok usano token paste) ──────────────────

@app.route("/api/oauth/youtube/start", methods=["POST"])
def oauth_yt_start():
    creds_path = BASE / "data" / "yt_credentials.json"
    if not creds_path.exists():
        return jsonify({"ok": False, "error": "Posiziona prima data/yt_credentials.json"})
    script = (
        "import sys; from pathlib import Path\n"
        "from google_auth_oauthlib.flow import InstalledAppFlow\n"
        "BASE = Path(sys.argv[1])\n"
        "flow = InstalledAppFlow.from_client_secrets_file(\n"
        "    str(BASE / 'data' / 'yt_credentials.json'),\n"
        "    ['https://www.googleapis.com/auth/youtube.upload']\n"
        ")\n"
        "creds = flow.run_local_server(port=0, open_browser=True)\n"
        "(BASE / 'data' / 'yt_token.json').write_text(creds.to_json())\n"
    )
    subprocess.Popen([sys.executable, "-c", script, str(BASE)], cwd=str(BASE))
    return jsonify({"ok": True, "message": "Browser aperto — completa l'autenticazione Google"})


@app.route("/api/oauth/gcal/start", methods=["POST"])
def oauth_gcal_start():
    creds_path = BASE / "data" / "gcal_credentials.json"
    if not creds_path.exists():
        return jsonify({"ok": False, "error": "Posiziona prima data/gcal_credentials.json"})
    script = (
        "import sys; from pathlib import Path\n"
        "from google_auth_oauthlib.flow import InstalledAppFlow\n"
        "BASE = Path(sys.argv[1])\n"
        "flow = InstalledAppFlow.from_client_secrets_file(\n"
        "    str(BASE / 'data' / 'gcal_credentials.json'),\n"
        "    ['https://www.googleapis.com/auth/calendar']\n"
        ")\n"
        "creds = flow.run_local_server(port=0, open_browser=True)\n"
        "(BASE / 'data' / 'gcal_token.json').write_text(creds.to_json())\n"
    )
    subprocess.Popen([sys.executable, "-c", script, str(BASE)], cwd=str(BASE))
    return jsonify({"ok": True, "message": "Browser aperto — completa l'autenticazione Google Calendar"})

# ── END OAUTH FLOWS ───────────────────────────────────────────────────────────

# ── CREDENTIALS ──────────────────────────────────────────────────────────────

ENV_PATH = BASE / ".env"

def _read_env() -> dict:
    env = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env

def _write_env(env: dict):
    lines = []
    # Preserva commenti dall'example
    example = BASE / ".env.example"
    if example.exists():
        for line in example.read_text().splitlines():
            stripped = line.strip()
            if stripped.startswith("#") or not stripped:
                lines.append(line)
            elif "=" in stripped:
                key = stripped.split("=", 1)[0].strip()
                val = env.get(key, "")
                lines.append(f"{key}={val}")
    else:
        for k, v in env.items():
            lines.append(f"{k}={v}")
    ENV_PATH.write_text("\n".join(lines) + "\n")
    # Aggiorna anche os.environ per il processo corrente
    for k, v in env.items():
        if v:
            os.environ[k] = v


@app.route("/api/credentials/status")
def credentials_status():
    """Ritorna quali credenziali sono configurate (mascherato) + stato validazione."""
    env = _read_env()
    def masked(val): return (val[:4] + "••••" + val[-4:]) if len(val) > 8 else ("•" * len(val) if val else "")
    def present(key): return bool(env.get(key, "").strip())

    return jsonify({
        "instagram": {
            "configured": present("IG_ACCESS_TOKEN") and present("IG_ACCOUNT_ID"),
            "token_preview": masked(env.get("IG_ACCESS_TOKEN", "")),
            "account_id": env.get("IG_ACCOUNT_ID", ""),
        },
        "tiktok": {
            "configured": present("TT_ACCESS_TOKEN"),
            "token_preview": masked(env.get("TT_ACCESS_TOKEN", "")),
        },
        "youtube": {
            "configured": (BASE / "data" / "yt_credentials.json").exists(),
            "file_path": "data/yt_credentials.json",
            "token_ready": (BASE / "data" / "yt_token.json").exists(),
        },
        "gcal": {
            "configured": (BASE / "data" / "gcal_credentials.json").exists(),
            "file_path": "data/gcal_credentials.json",
            "token_ready": (BASE / "data" / "gcal_token.json").exists(),
        },
        "pexels": {
            "configured": present("PEXELS_API_KEY"),
            "token_preview": masked(env.get("PEXELS_API_KEY", "")),
        },
        "public_url": {
            "configured": present("PUBLIC_BASE_URL"),
            "value": env.get("PUBLIC_BASE_URL", ""),
        },
    })


@app.route("/api/credentials/save", methods=["POST"])
def credentials_save():
    """Salva una o più credenziali nel .env."""
    data = request.json or {}
    env = _read_env()
    allowed = {
        "IG_ACCESS_TOKEN", "IG_ACCOUNT_ID",
        "TT_ACCESS_TOKEN",
        "PEXELS_API_KEY",
        "PUBLIC_BASE_URL",
        "REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET",
    }
    updated = []
    for key, val in data.items():
        if key in allowed:
            env[key] = str(val).strip()
            os.environ[key] = str(val).strip()
            updated.append(key)
    _write_env(env)
    return jsonify({"ok": True, "updated": updated})


@app.route("/api/credentials/test/<platform>")
def credentials_test(platform):
    """Testa una credenziale facendo una chiamata reale all'API."""
    env = _read_env()

    if platform == "instagram":
        token = env.get("IG_ACCESS_TOKEN", "")
        account_id = env.get("IG_ACCOUNT_ID", "")
        if not token or not account_id:
            return jsonify({"ok": False, "error": "Token o Account ID mancanti"})
        try:
            import urllib.request, urllib.error
            url = f"https://graph.facebook.com/v20.0/{account_id}?fields=name,username&access_token={token}"
            resp = urllib.request.urlopen(url, timeout=8)
            d = json.loads(resp.read())
            return jsonify({"ok": True, "info": f"@{d.get('username', d.get('name', account_id))}"})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)[:120]})

    elif platform == "tiktok":
        token = env.get("TT_ACCESS_TOKEN", "")
        if not token:
            return jsonify({"ok": False, "error": "Token mancante"})
        try:
            import urllib.request
            req = urllib.request.Request(
                "https://open.tiktokapis.com/v2/user/info/?fields=display_name,username",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp = urllib.request.urlopen(req, timeout=8)
            d = json.loads(resp.read())
            username = d.get("data", {}).get("user", {}).get("display_name", "OK")
            return jsonify({"ok": True, "info": username})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)[:120]})

    elif platform == "pexels":
        key = env.get("PEXELS_API_KEY", "")
        if not key:
            return jsonify({"ok": False, "error": "API Key mancante"})
        try:
            import urllib.request
            req = urllib.request.Request(
                "https://api.pexels.com/v1/search?query=nature&per_page=1",
                headers={"Authorization": key},
            )
            resp = urllib.request.urlopen(req, timeout=8)
            d = json.loads(resp.read())
            return jsonify({"ok": True, "info": f"{d.get('total_results', '?')} video disponibili"})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)[:120]})

    elif platform == "youtube":
        creds_path = BASE / "data" / "yt_credentials.json"
        if not creds_path.exists():
            return jsonify({"ok": False, "error": "File yt_credentials.json non trovato in data/"})
        try:
            d = json.loads(creds_path.read_text())
            has_key = "installed" in d or "web" in d or "client_id" in d
            return jsonify({"ok": has_key, "info": "File OAuth trovato — verrà autenticato al primo uso" if has_key else "Formato non valido"})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)[:120]})

    elif platform == "gcal":
        creds_path = BASE / "data" / "gcal_credentials.json"
        if not creds_path.exists():
            return jsonify({"ok": False, "error": "File gcal_credentials.json non trovato in data/"})
        try:
            d = json.loads(creds_path.read_text())
            has_key = "installed" in d or "web" in d
            return jsonify({"ok": has_key, "info": "Credenziali OAuth trovate" if has_key else "Formato non valido"})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)[:120]})

    return jsonify({"ok": False, "error": f"Piattaforma sconosciuta: {platform}"})


@app.route("/api/credentials/open-folder")
def credentials_open_folder():
    """Apre la cartella data/ nel Finder (per caricare file OAuth)."""
    subprocess.Popen(["open", str(BASE / "data")])
    return jsonify({"ok": True})


@app.route("/api/credentials/ig-account-id")
def detect_ig_account_id():
    """Dato un access token IG, rileva l'Instagram Business Account ID."""
    import urllib.request
    token = request.args.get("token", "").strip() or _read_env().get("IG_ACCESS_TOKEN", "")
    if not token:
        return jsonify({"ok": False, "error": "Token mancante"})
    try:
        pages_resp = urllib.request.urlopen(
            f"https://graph.facebook.com/v20.0/me/accounts?access_token={token}",
            timeout=10,
        )
        pages = json.loads(pages_resp.read()).get("data", [])
        for page in pages:
            page_token = page.get("access_token", "")
            page_id = page.get("id", "")
            if page_id and page_token:
                ib_resp = urllib.request.urlopen(
                    f"https://graph.facebook.com/v20.0/{page_id}"
                    f"?fields=instagram_business_account&access_token={page_token}",
                    timeout=10,
                )
                ib = json.loads(ib_resp.read()).get("instagram_business_account", {})
                if ib.get("id"):
                    return jsonify({"ok": True, "account_id": ib["id"]})
        # Fallback: user ID diretto
        me_resp = urllib.request.urlopen(
            f"https://graph.instagram.com/me?fields=id,username&access_token={token}",
            timeout=10,
        )
        me = json.loads(me_resp.read())
        if me.get("id"):
            return jsonify({"ok": True, "account_id": me["id"], "username": me.get("username", "")})
        return jsonify({"ok": False, "error": "Account non trovato — inserisci manualmente"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)[:150]})

# ── END CREDENTIALS ───────────────────────────────────────────────────────────

# ── END VIDEO PREVIEW ────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Init learning DB all'avvio
    try:
        from agents.memory import init_learning_db
        init_learning_db()
    except Exception:
        pass
    app.run(port=5174, debug=False)
