# WhyPost — Stato Reale e Roadmap Completa

> **Aggiornato:** 22 Maggio 2026
> **Autore:** Claude (sessione compatta dalla nascita del progetto)

---

## CHE COS'È

Sistema open source di content automation che produce e pubblica 5-7 video/giorno
(Instagram Reels, TikTok, YouTube Shorts) a €0/mese extra usando solo Claude Pro headless.

**Operatore:** Edoardo — solo, dal Mac, senza toccare il CLI.
**UI:** React dashboard Mission Control su `http://localhost:5173`
**Backend:** Python agents + Flask :5174 + SQLite

---

## STACK COMPLETO

| Layer | Tecnologia |
|-------|-----------|
| Dashboard | React 19 + Vite + TypeScript + Framer Motion v12 |
| Backend bridge | Flask :5174 (file-system bridge, ~200 righe) |
| Agents | Python 3.12, venv in `~/Documents/WhyPost/venv/` |
| Database | SQLite: `ideas.db`, `metrics.db`, `learning.db` |
| TTS | edge-tts (voci Microsoft, gratuito) |
| B-roll | Pexels API (richiede `PEXELS_API_KEY` in env) |
| Captions | whisper.cpp locale (da installare) |
| Video render | Remotion (Node/TypeScript) in `~/Documents/WhyPost/remotion/` |
| AI headless | `claude -p prompt --model sonnet` via subprocess |
| Fonte di verità | `config.yaml` — topics, buffer, platforms, schedule |

---

## AGENTI (9 entità nominate)

| Agente | File | Ruolo |
|--------|------|-------|
| MAIN | `agents/main.py` | Orchestratore, check buffer, cron entry |
| EXEL | `agents/exel.py` | Scraping idee (Reddit/RSS/HN → `ideas.db`) |
| SCRIPT | `agents/script_writer.py` | Claude headless → script video |
| ASSET | `agents/asset.py` | edge-tts + Pexels B-roll + whisper captions |
| CLACK | `~/Remotion/` + `agents/clack.py` | Remotion render → .mp4 |
| SAFETY | `agents/safety.py` | Validazione regole + Claude rare check |
| PUBLISHER | `agents/publisher.py` | Instagram Graph API → TikTok |
| TELEMETRY | `agents/telemetry.py` | Metriche notturne → `metrics.db` |
| OPUS | `agents/opus.py` | Weekly review domenicale con Claude Opus |

---

## CONTRATTO TRA AGENTI (file condivisi)

```
state.json   — stato real-time di ogni agente (Flask lo serve a /state)
queue.json   — coda video con status pipeline
config.yaml  — configurazione unica, UI scrive via POST /config
ideas.db     — idee scrappate da EXEL
learning.db  — memory engine (pesi esponenziali 1.8^n)
metrics.db   — telemetria video pubblicati
data/assets/<video_id>/audio.mp3    — TTS generato da ASSET
data/assets/<video_id>/broll_*.mp4  — B-roll scaricato da ASSET
data/renders/<video_id>/out.mp4     — video finale da CLACK
```

---

## ═══════════════════════════════════════════════
## PASSATO — COSA È STATO COSTRUITO
## ═══════════════════════════════════════════════

### ✅ SETTIMANA 1 — Infrastruttura (20-21 Maggio 2026)

**Commit git presenti (21 Maggio, ore 01:03-01:16):**
- `1d2d897` — Core infrastructure (SQLite, Flask, Claude wrapper, crontab)
- `bff86d6` — Mission Control SwiftUI (abbandonato: Edoardo non ha Xcode)
- `3265720` — Agent Pipeline (EXEL, SCRIPT, ASSET, SAFETY, PUBLISHER, MAIN skeleton)
- `ca667a1` — Memory Engine (385 righe, auto-learning esponenziale)

**Cosa funziona oggi:**
- Flask server gira su :5174 con `source venv/bin/activate && python3 server/app.py`
- Routes: `/state`, `/queue`, `/config`, `/memory/summary`, `/claude`, `/video/*`
- EXEL ha già girato una volta: **29 idee** in `ideas.db`
- SCRIPT ha già girato una volta: **1 script** generato (AI + geometria discreta)
- SAFETY ha già girato: ha marcato il video `needs_fix` per "Audio TTS mancante"
- Memory engine: `learning.db` attivo, `init_learning_db()` chiamato all'avvio Flask

**Dashboard React (NON su git — untracked da sempre):**
- 5.240 righe React, build pulita, dev server su :5173
- Componenti: AgentGrid, BottomBar, Calendar, ChatSidebar (WhyChat), Dashboard,
  QueuePanel, Sidebar, Statistics, StatusBadge, VideoPreviewModal, SocialConnectModal
- Pagine: AgentsPage, CalendarPage, MemoryPage, QueuePage, SettingsPage
- Design system: OKLCH, NeuePower + Geist, Framer Motion spring physics
- Funzionalità UI: BlacklistEditor, DailyTopicEditor, TypePicker, config sync
- Light/dark theme toggle

---

## ═══════════════════════════════════════════════
## BUG ATTIVI — DA FIXARE SUBITO
## ═══════════════════════════════════════════════

### 🔴 BUG-1: React poll sul path sbagliato
**Problema:** `useStore.ts` fa fetch su `/api/state`, `/api/queue`, `/api/memory/summary`
ma Flask serve `/state`, `/queue`, `/memory/summary` (senza prefisso `/api/`)
**Effetto:** la dashboard mostra sempre dati vuoti / stato mock
**Fix:** aggiungere prefisso `/api/` alle route Flask OPPURE toglierlo da useStore.ts

### 🔴 BUG-2: audio.mp3 0 bytes (TTS silently fails)
**Problema:** `data/assets/wp_20260521_010716_00/audio.mp3` esiste ma è 0 bytes
edge-tts ha lanciato ma non ha scritto nulla — manca check su `file.stat().st_size`
**Effetto:** ASSET marca il video "needs_fix" per audio mancante, pipeline bloccata
**Fix:** in `asset.py`, dopo `await communicate.save()`, verificare `output_path.stat().st_size > 0`

### 🟡 BUG-3: Web app non è su git
**Problema:** tutta la cartella `web/` è untracked da quando è stata creata (21 Maggio)
**Rischio:** perdita totale in caso di crash disco
**Fix:** `git add web/ && git commit -m "feat: Mission Control React dashboard"`

### 🟡 BUG-4: Flask non ha /run endpoint
**Problema:** Dashboard ha un pulsante "Run Pipeline" che fa `POST /api/run`
ma Flask non ha questa route
**Fix:** aggiungere route `/run` che esegue `python3 agents/main.py check_buffer`

---

## ═══════════════════════════════════════════════
## FUTURO — ROADMAP SETTIMANA 2-7
## ═══════════════════════════════════════════════

### SETTIMANA 2 — Pipeline funzionante (obiettivo: 1° video .mp4 generato)

**Task 2.1 — Fix BUG-1: routes Flask/React (30 min)**
```python
# server/app.py — aggiungere prefisso /api/ a tutte le route
@app.route("/api/state")
def get_state(): ...

@app.route("/api/queue")  
def get_queue(): ...

@app.route("/api/config", methods=["GET"])
def get_config(): ...

@app.route("/api/config", methods=["POST"])
def set_config(): ...

@app.route("/api/memory/summary")
def memory_summary(): ...

@app.route("/api/run", methods=["POST"])
def run_pipeline():
    import subprocess
    subprocess.Popen(["python3", "agents/main.py", "check_buffer"], cwd=str(BASE))
    return jsonify({"ok": True, "message": "pipeline avviata"})
```

**Task 2.2 — Fix BUG-2: TTS 0 bytes (15 min)**
```python
# agents/asset.py — dopo generate_tts()
async def generate_tts(text: str, voice: str, output_path: Path) -> bool:
    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(output_path))
        # Verifica che il file abbia contenuto reale
        if not output_path.exists() or output_path.stat().st_size < 1000:
            logger.error(f"TTS ha prodotto file vuoto: {output_path}")
            output_path.unlink(missing_ok=True)
            return False
        return True
    except Exception as e:
        logger.error(f"TTS error: {e}")
        output_path.unlink(missing_ok=True)
        return False
```

**Task 2.3 — Fix BUG-3: commit web/ su git (5 min)**
```bash
cd ~/Documents/WhyPost
git add web/
git commit -m "feat: Mission Control React dashboard (WhyChat, Calendar, BottomBar, full UI)"
```

**Task 2.4 — Test ASSET manuale sul video esistente (20 min)**
```bash
cd ~/Documents/WhyPost && source venv/bin/activate
python3 -c "
from agents.asset import run_asset_for_video
import json
queue = json.loads(open('queue.json').read())
video = queue['videos'][0]
run_asset_for_video(video)
"
# Verifica: data/assets/wp_20260521_010716_00/audio.mp3 > 0 bytes
ls -lh data/assets/wp_20260521_010716_00/
```

**Task 2.5 — CLACK integration Remotion (2-3 ore)**

CLACK deve:
1. Prendere un video dalla queue con `status: "assets_ready"`
2. Copiare script + audio + b-roll nella cartella Remotion
3. Lanciare `npx remotion render` con i parametri giusti
4. Spostare il .mp4 in `data/renders/<video_id>/out.mp4`
5. Aggiornare `queue.json` → `status: "rendered"`

```python
# agents/clack.py — struttura base
import subprocess, json, shutil
from pathlib import Path

BASE = Path(__file__).parent.parent
REMOTION_DIR = BASE / "remotion"

def run():
    queue_path = BASE / "queue.json"
    queue = json.loads(queue_path.read_text())
    
    for video in queue.get("videos", []):
        if video.get("status") != "assets_ready":
            continue
        
        vid_id = video["id"]
        assets_dir = BASE / "data" / "assets" / vid_id
        render_dir = BASE / "data" / "renders" / vid_id
        render_dir.mkdir(parents=True, exist_ok=True)
        
        # Aggiorna stato
        video["status"] = "rendering"
        update_agent_state("CLACK", "running", {"rendering": vid_id})
        
        # Prepara props per Remotion
        props = {
            "videoId": vid_id,
            "script": video["script"],
            "audioPath": str(assets_dir / "audio.mp3"),
            "brollPaths": [str(p) for p in assets_dir.glob("broll_*.mp4")],
            "videoType": video.get("video_type", "tech_news"),
        }
        
        # Scrivi props.json per Remotion
        props_path = REMOTION_DIR / "props.json"
        props_path.write_text(json.dumps(props, ensure_ascii=False))
        
        # Render
        result = subprocess.run(
            ["npx", "remotion", "render", "src/index.ts", "WhyPostVideo",
             "--props", str(props_path),
             "--output", str(render_dir / "out.mp4")],
            cwd=str(REMOTION_DIR), capture_output=True, text=True, timeout=300
        )
        
        if result.returncode == 0:
            video["status"] = "rendered"
            update_agent_state("CLACK", "idle", {"rendering": None})
        else:
            video["status"] = "render_failed"
            video["render_error"] = result.stderr[-500:]
            update_agent_state("CLACK", "error", {})
    
    queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))
```

**Task 2.6 — Template Remotion base (TechNews) (3-4 ore)**

Il template minimo deve:
- Leggere `props.json` con script e audio
- Mostrare hook in testo grande (NeuePower) + background B-roll
- Audio sincronizzato alla durata del video
- Output 1080x1920 (portrait), 30fps

```typescript
// remotion/src/TechNewsTemplate.tsx — struttura base
import { useCurrentFrame, useVideoConfig, Audio, AbsoluteFill, staticFile } from 'remotion';

export const TechNewsTemplate = ({ script, audioPath, brollPaths }) => {
  const { durationInFrames, fps } = useVideoConfig();
  
  // Divide il corpo del script in segmenti temporali
  const segments = script.body;
  const segmentDuration = Math.floor(durationInFrames / segments.length);
  const currentSegment = Math.min(
    Math.floor(useCurrentFrame() / segmentDuration),
    segments.length - 1
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#070709' }}>
      {/* B-roll background */}
      {brollPaths[currentSegment % brollPaths.length] && (
        <video
          src={brollPaths[currentSegment % brollPaths.length]}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }}
          autoPlay muted
        />
      )}
      {/* Testo */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', padding: 60 }}>
        <h1 style={{
          fontFamily: 'NeuePower', fontSize: 72, color: '#eff0f2',
          textAlign: 'center', lineHeight: 1.2,
        }}>
          {segments[currentSegment]}
        </h1>
      </AbsoluteFill>
      {/* Audio TTS */}
      <Audio src={audioPath} />
    </AbsoluteFill>
  );
};
```

---

### SETTIMANA 3 — ASSET pipeline completa

**Task 3.1 — Pexels B-roll funzionante**
- Impostare `PEXELS_API_KEY` in `.env` e caricarlo in Flask/agents
- Testare `fetch_broll("artificial intelligence mathematics")` → 3 video scaricati

**Task 3.2 — whisper.cpp captions**
```bash
# Installazione (una tantum)
brew install cmake
git clone https://github.com/ggerganov/whisper.cpp ~/whisper.cpp
cd ~/whisper.cpp && make
bash ./models/download-ggml-model.sh base
```
- Generare `captions.json` (timestamps per ogni frase) da `audio.mp3`
- Integrare captions nel template Remotion (karaoke text)

**Task 3.3 — Pipeline EXEL → SCRIPT → ASSET → CLACK automatica**
- `main.py cmd_check_buffer()` già fa EXEL+SCRIPT
- Aggiungere chiamata ASSET dopo SCRIPT
- Aggiungere chiamata CLACK dopo ASSET
- Test: partire da 0 idee, arrivare a 1 .mp4 in `data/renders/`

---

### SETTIMANA 4 — Template Remotion (3 tipi)

**TechNews** (priorità alta, già abbozzato)
- Hook 3s → corpo 30s → CTA 5s
- B-roll sfocato + testo grande centrale
- Accent verde on keywords

**Tutorial**
- Struttura a step numerati
- Screen recording placeholder o B-roll tecnico
- Progress bar orizzontale

**BestOf**
- Compilation style: 5 fatti veloci
- Ogni fatto = 6 secondi = 1 clip B-roll
- Stile più energico, cuts rapidi

---

### SETTIMANA 5 — SAFETY + PUBLISHER Instagram

**SAFETY:**
- Regole hardcoded (blacklist da `config.yaml`)
- Claude check raro (solo se SAFETY_DOUBT flag attivo)
- Output: `status: "ready"` oppure `status: "needs_fix"` con motivo

**PUBLISHER Instagram:**
```python
# agents/publisher.py
import requests, os

def publish_to_instagram(video_path: str, caption: str) -> bool:
    account_id = os.getenv("IG_ACCOUNT_ID")
    access_token = os.getenv("IG_ACCESS_TOKEN")
    
    # Step 1: Upload container
    container_url = f"https://graph.facebook.com/v19.0/{account_id}/media"
    r = requests.post(container_url, data={
        "video_url": video_path,  # URL pubblico del video (serve hosting temporaneo)
        "caption": caption,
        "media_type": "REELS",
        "access_token": access_token,
    })
    container_id = r.json().get("id")
    
    # Step 2: Publish
    publish_url = f"https://graph.facebook.com/v19.0/{account_id}/media_publish"
    r2 = requests.post(publish_url, data={
        "creation_id": container_id,
        "access_token": access_token,
    })
    return r2.status_code == 200
```

**Problema hosting video:** Instagram Graph API richiede un URL pubblico per il video.
Opzioni gratuite:
- ngrok temporaneo durante la pubblicazione
- Upload su Cloudinary free tier (10GB/mese)
- Servire direttamente da Flask con ngrok tunnel

---

### SETTIMANA 6 — TikTok + Telemetria

**TikTok:**
- TikTok Content Posting API (token da `TT_ACCESS_TOKEN`)
- Struttura simile a Instagram ma API diversa
- Test: pubblicazione diretta da `data/renders/`

**TELEMETRY:**
- Cron notturno (01:00)
- Legge views/likes dalle API social
- Scrive in `metrics.db`
- Aggiorna `learning.db` con `learn_from_video()`

---

### SETTIMANA 7 — OPUS weekly review + crontab completo

**OPUS:**
```bash
# Ogni domenica alle 10:00
0 10 * * 0 cd ~/Documents/WhyPost && source venv/bin/activate && python3 agents/opus.py
```
- Claude Opus legge `metrics.db` ultimi 7 giorni
- Genera report: cosa ha funzionato, cosa no, suggerimenti per la settimana
- Aggiorna `config.yaml` suggerimenti (topic da aumentare/diminuire)

**Crontab finale:**
```bash
# crontab -e
0 8  * * * cd ~/Documents/WhyPost && source venv/bin/activate && python3 agents/main.py check_buffer
0 12 * * * cd ~/Documents/WhyPost && source venv/bin/activate && python3 agents/main.py check_buffer
0 18 * * * cd ~/Documents/WhyPost && source venv/bin/activate && python3 agents/main.py publish_due
0 1  * * * cd ~/Documents/WhyPost && source venv/bin/activate && python3 agents/telemetry.py
0 10 * * 0 cd ~/Documents/WhyPost && source venv/bin/activate && python3 agents/opus.py
```

---

## ═══════════════════════════════════════════════
## PRIORITÀ IMMEDIATA (adesso)
## ═══════════════════════════════════════════════

Fare queste 4 cose in ordine, oggi:

1. **git add web/** — 5 minuti, rischio zero di perdita lavoro
2. **Fix routes Flask** (aggiungere `/api/` prefix) — 30 minuti, dashboard live
3. **Fix TTS 0 bytes** — 15 minuti, pipeline si sblocca
4. **Test ASSET manuale** → verificare che `audio.mp3` sia > 0 bytes
5. **Test pipeline completa** `EXEL → SCRIPT → ASSET` su una nuova idea

Questo sblocca il milestone più importante: **vedere la dashboard con dati reali**.

---

## MILESTONE TRACKING

| # | Milestone | Stato | Data |
|---|-----------|-------|------|
| 1 | Infrastruttura Python + Flask | ✅ Fatto | 21 Mag |
| 2 | Dashboard React UI completa | ✅ Fatto | 22 Mag |
| 3 | Dashboard connessa a dati reali | 🔴 Bloccata (route mismatch) | - |
| 4 | 1° audio TTS generato correttamente | 🔴 Bloccata (0 bytes) | - |
| 5 | 1° video .mp4 renderizzato da Remotion | ⏳ Da fare | Sett 2 |
| 6 | 1° video pubblicato su Instagram | ⏳ Da fare | Sett 5 |
| 7 | Pipeline automatica via crontab | ⏳ Da fare | Sett 7 |
| 8 | 7-day buffer mantenuto autonomamente | ⏳ Da fare | Sett 7 |
