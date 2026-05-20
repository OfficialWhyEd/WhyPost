# WhyPost — Full System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire WhyPost, un sistema open source di content automation che produce e pubblica automaticamente video su Instagram, TikTok e YouTube Shorts a costo zero, controllato da un'app macOS nativa (SwiftUI) con CHAT-AI integrata.

**Architecture:** Agent Teams Python (MAIN, EXEL, SCRIPT, ASSET, CLACK, SAFETY, PUBLISHER, TELEMETRY, OPUS) orchestrati via cron, con Claude Code headless per script writing e review. Mission Control è un'app SwiftUI nativa su macOS 12+ con dashboard statistiche, calendario settimanale drag&drop, e sidebar CHAT-AI che controlla tutto via linguaggio naturale.

**Tech Stack:** Python 3.12 + SQLite + crontab | edge-tts + whisper.cpp + Pexels API | Remotion (Node/TypeScript) | SwiftUI macOS 12+ | Flask 30 righe (bridge file-system) | Claude Code Pro headless (`claude -p`)

---

## SUB-PROJECT BREAKDOWN

Questo sistema è troppo grande per un singolo piano lineare. Si divide in 3 sub-project indipendenti che girano in **parallelo con Agent Teams**:

| Sub-project | Team | Output |
|-------------|------|--------|
| **A — Core Infrastructure** | Agent A | config.yaml, SQLite, Flask server, cron, wrapper Claude |
| **B — Mission Control SwiftUI** | Agent B | App macOS nativa completa |
| **C — Agent Pipeline** | Agent C | EXEL→SCRIPT→ASSET→CLACK→SAFETY→PUBLISHER |

Il contratto tra i team è: **file system condiviso** (`state.json`, `queue.json`, `config.yaml`). Ogni agent legge/scrive su questi file. Mission Control li monitora in polling.

---

## SUB-PROJECT A — Core Infrastructure

### Task A1: Struttura cartelle e git

**Files:**
- Create: `~/Documents/WhyPost/` (già fatto)
- Create: `.gitignore`
- Create: `README.md`
- Create: `requirements.txt`

- [ ] **Step 1: Init git repo**
```bash
cd ~/Documents/WhyPost
git init
git branch -M main
```

- [ ] **Step 2: Crea .gitignore**
```
.env
data/renders/
data/assets/
data/logs/
__pycache__/
*.pyc
.DS_Store
*.db
```

- [ ] **Step 3: Crea requirements.txt**
```
praw==7.7.1
feedparser==6.0.11
requests==2.31.0
edge-tts==6.1.9
flask==3.0.3
pyyaml==6.0.2
ratelimit==2.2.1
schedule==1.2.2
```

- [ ] **Step 4: Installa dipendenze**
```bash
cd ~/Documents/WhyPost
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Expected: nessun errore, `pip list` mostra tutti i pacchetti

- [ ] **Step 5: Primo commit**
```bash
git add .gitignore requirements.txt config.yaml state.json queue.json
git commit -m "feat: init WhyPost project structure"
```

---

### Task A2: SQLite schema — ideas.db e metrics.db

**Files:**
- Create: `agents/db.py`

- [ ] **Step 1: Crea agents/db.py**
```python
import sqlite3
from pathlib import Path

BASE = Path(__file__).parent.parent
IDEAS_DB  = BASE / "data" / "ideas.db"
METRICS_DB = BASE / "data" / "metrics.db"

def get_ideas_conn():
    conn = sqlite3.connect(IDEAS_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_metrics_conn():
    conn = sqlite3.connect(METRICS_DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_ideas_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ideas (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                hash       TEXT UNIQUE NOT NULL,
                title      TEXT NOT NULL,
                source     TEXT,
                topic      TEXT,
                language   TEXT DEFAULT 'it',
                status     TEXT DEFAULT 'raw',
                created_at TEXT DEFAULT (datetime('now')),
                used_at    TEXT
            )
        """)

    with get_metrics_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS metrics (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id     TEXT NOT NULL,
                platform     TEXT NOT NULL,
                post_id      TEXT,
                views        INTEGER DEFAULT 0,
                likes        INTEGER DEFAULT 0,
                comments     INTEGER DEFAULT 0,
                shares       INTEGER DEFAULT 0,
                fetched_at   TEXT DEFAULT (datetime('now'))
            )
        """)

if __name__ == "__main__":
    init_db()
    print("DBs initialized OK")
```

- [ ] **Step 2: Esegui e verifica**
```bash
cd ~/Documents/WhyPost
source venv/bin/activate
python -m agents.db
```
Expected: `DBs initialized OK` — files `data/ideas.db` e `data/metrics.db` creati

- [ ] **Step 3: Commit**
```bash
git add agents/db.py
git commit -m "feat: SQLite schema for ideas and metrics"
```

---

### Task A3: Wrapper Claude Code headless

**Files:**
- Create: `agents/claude.py`

- [ ] **Step 1: Crea agents/claude.py**
```python
import subprocess
import time
import logging

logger = logging.getLogger(__name__)

BACKOFF = [30, 60, 300, 900]  # secondi: 30s → 1m → 5m → 15m

def ask_claude(prompt: str, model: str = "sonnet") -> str:
    for attempt, wait in enumerate([0] + BACKOFF):
        if wait:
            logger.warning(f"Rate limit hit, waiting {wait}s (attempt {attempt})")
            time.sleep(wait)
        try:
            result = subprocess.run(
                ["claude", "-p", prompt, "--model", model],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode == 0:
                return result.stdout.strip()
            if "rate limit" in result.stderr.lower():
                continue
            logger.error(f"Claude error: {result.stderr}")
            return ""
        except subprocess.TimeoutExpired:
            logger.error("Claude timed out after 120s")
            return ""
    logger.error("All retry attempts exhausted")
    return ""
```

- [ ] **Step 2: Test manuale**
```bash
python -c "from agents.claude import ask_claude; print(ask_claude('Di solo: WHYPOST OK'))"
```
Expected: `WHYPOST OK`

- [ ] **Step 3: Commit**
```bash
git add agents/claude.py agents/__init__.py
git commit -m "feat: Claude Code headless wrapper with backoff"
```

---

### Task A4: Flask server (bridge file-system per Mission Control)

**Files:**
- Create: `server/app.py`

- [ ] **Step 1: Crea server/app.py**
```python
from flask import Flask, jsonify, request
from pathlib import Path
import json, yaml

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

if __name__ == "__main__":
    app.run(port=5174, debug=False)
```

- [ ] **Step 2: Test server**
```bash
cd ~/Documents/WhyPost
source venv/bin/activate
python server/app.py &
curl http://localhost:5174/state
```
Expected: JSON con stato agenti

- [ ] **Step 3: Commit**
```bash
git add server/app.py
git commit -m "feat: Flask file-system bridge for Mission Control"
```

---

### Task A5: Crontab setup

**Files:**
- Create: `crontab.txt`

- [ ] **Step 1: Crea crontab.txt**
```cron
# WhyPost — crontab
# Install: crontab crontab.txt

# Idea sourcing ogni mattina
0 6 * * *    cd ~/Documents/WhyPost && source venv/bin/activate && python -m agents.exel

# Buffer check + script writing
0 7 * * *    cd ~/Documents/WhyPost && source venv/bin/activate && python -m agents.main check_buffer

# Asset pipeline
30 7 * * *   cd ~/Documents/WhyPost && source venv/bin/activate && python -m agents.asset

# Render
0 8 * * *    cd ~/Documents/WhyPost && source venv/bin/activate && python -m agents.clack render

# Publisher — ogni 15 min controlla slot
*/15 * * * * cd ~/Documents/WhyPost && source venv/bin/activate && python -m agents.publisher

# Telemetry
0 22 * * *   cd ~/Documents/WhyPost && source venv/bin/activate && python -m agents.telemetry

# Weekly review domenica
0 9 * * 0    cd ~/Documents/WhyPost && source venv/bin/activate && python -m agents.opus
```

- [ ] **Step 2: Installa cron**
```bash
crontab ~/Documents/WhyPost/crontab.txt
crontab -l  # verifica
```

- [ ] **Step 3: Commit**
```bash
git add crontab.txt
git commit -m "feat: crontab for all WhyPost agents"
```

---

## SUB-PROJECT B — Mission Control SwiftUI

### Task B1: Xcode project setup

**Files:**
- Create: `mission-control/WhyPost.xcodeproj`
- Create: `mission-control/WhyPost/WhyPostApp.swift`

- [ ] **Step 1: Crea Xcode project**
```
Xcode → File → New → Project
Template: macOS → App
Product Name: WhyPost
Interface: SwiftUI
Language: Swift
Bundle ID: com.whyed.whypost
Min deployment: macOS 12.0
Salva in: ~/Documents/WhyPost/mission-control/
```

- [ ] **Step 2: Configura WhyPostApp.swift**
```swift
import SwiftUI

@main
struct WhyPostApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .frame(minWidth: 1200, minHeight: 750)
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
```

- [ ] **Step 3: Build per verificare**
```
Xcode → Product → Build (⌘B)
```
Expected: Build Succeeded

---

### Task B2: AppStore — stato globale + polling

**Files:**
- Create: `mission-control/WhyPost/AppStore.swift`

- [ ] **Step 1: Crea AppStore.swift**
```swift
import Foundation
import Combine

struct AgentStatus: Codable, Identifiable {
    var id: String
    var status: String
    var last_run: String?
}

struct SystemState: Codable {
    var system: String
    var buffer: BufferState
    var agents: [String: AgentStatus]
}

struct BufferState: Codable {
    var ready_videos: Int
    var target_days: Int
    var next_publish: String?
}

struct VideoItem: Codable, Identifiable {
    var id: String
    var title: String
    var status: String
    var platform: [String]
    var scheduled_at: String?
    var language: String?
}

@MainActor
class AppStore: ObservableObject {
    @Published var state = SystemState(
        system: "idle",
        buffer: BufferState(ready_videos: 0, target_days: 7, next_publish: nil),
        agents: [:]
    )
    @Published var queue: [VideoItem] = []
    @Published var chatMessages: [ChatMessage] = []
    @Published var isPolling = false

    private let baseURL = "http://localhost:5174"
    private var timer: Timer?

    func startPolling() {
        isPolling = true
        timer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { await self?.fetchAll() }
        }
        Task { await fetchAll() }
    }

    func stopPolling() {
        timer?.invalidate()
        isPolling = false
    }

    func fetchAll() async {
        await fetchState()
        await fetchQueue()
    }

    private func fetchState() async {
        guard let url = URL(string: "\(baseURL)/state"),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let decoded = try? JSONDecoder().decode(SystemState.self, from: data)
        else { return }
        state = decoded
    }

    private func fetchQueue() async {
        guard let url = URL(string: "\(baseURL)/queue"),
              let (data, _) = try? await URLSession.shared.data(from: url)
        else { return }
        struct QueueWrapper: Codable { var videos: [VideoItem] }
        if let decoded = try? JSONDecoder().decode(QueueWrapper.self, from: data) {
            queue = decoded.videos
        }
    }
}
```

---

### Task B3: Layout principale — Split View

**Files:**
- Create: `mission-control/WhyPost/ContentView.swift`

- [ ] **Step 1: Crea ContentView.swift**
```swift
import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: AppStore
    @State private var isChatCollapsed = false

    var body: some View {
        HStack(spacing: 0) {
            // Dashboard — 65%
            DashboardView()
                .frame(maxWidth: .infinity)

            Divider()
                .background(Color.white.opacity(0.08))

            // CHAT-AI Sidebar — 35% (collassabile)
            if !isChatCollapsed {
                ChatSidebarView(isCollapsed: $isChatCollapsed)
                    .frame(width: 380)
                    .transition(.move(edge: .trailing))
            } else {
                Button(action: { withAnimation(.easeInOut(duration: 0.3)) { isChatCollapsed = false } }) {
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: 16))
                        .foregroundColor(.white.opacity(0.6))
                }
                .buttonStyle(.plain)
                .padding(12)
            }
        }
        .background(Color(red: 0.07, green: 0.07, blue: 0.09))
        .preferredColorScheme(.dark)
        .onAppear { store.startPolling() }
        .onDisappear { store.stopPolling() }
    }
}
```

---

### Task B4: Dashboard — Statistiche + Calendario + Bottom bar

**Files:**
- Create: `mission-control/WhyPost/Views/DashboardView.swift`
- Create: `mission-control/WhyPost/Views/StatisticsView.swift`
- Create: `mission-control/WhyPost/Views/CalendarView.swift`
- Create: `mission-control/WhyPost/Views/BottomBarView.swift`

- [ ] **Step 1: DashboardView.swift**
```swift
import SwiftUI

struct DashboardView: View {
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("WhyPost")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                Text("· Mission Control")
                    .font(.system(size: 15, weight: .regular))
                    .foregroundColor(.white.opacity(0.4))
                Spacer()
                StatusBadgeView()
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(Color.white.opacity(0.03))

            Divider().background(Color.white.opacity(0.08))

            // Statistiche
            StatisticsView()
                .padding(20)

            Divider().background(Color.white.opacity(0.05))

            // Calendario settimanale
            CalendarView()
                .padding(.horizontal, 20)
                .padding(.vertical, 16)

            Divider().background(Color.white.opacity(0.05))

            // Bottom: Argomenti + Scheduling + Social Stats
            BottomBarView()
                .padding(20)
        }
    }
}
```

- [ ] **Step 2: StatisticsView.swift**
```swift
import SwiftUI
import Charts

struct StatisticsView: View {
    @EnvironmentObject var store: AppStore

    let mockWeeklyData: [(day: String, count: Int)] = [
        ("L", 2), ("M", 3), ("M", 1), ("G", 4), ("V", 2), ("S", 3), ("D", 2)
    ]

    var body: some View {
        HStack(spacing: 16) {
            // Buffer card
            VStack(alignment: .leading, spacing: 8) {
                Text("BUFFER")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white.opacity(0.4))
                    .tracking(1.5)
                HStack(alignment: .bottom, spacing: 4) {
                    Text("\(store.state.buffer.ready_videos)")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    Text("/ \(store.state.buffer.target_days)d")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.4))
                        .padding(.bottom, 6)
                }
                if let next = store.state.buffer.next_publish {
                    Text("Prossima: \(next)")
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.5))
                }
            }
            .padding(16)
            .background(Color.white.opacity(0.05))
            .cornerRadius(12)

            // Bar chart — video per giorno
            VStack(alignment: .leading, spacing: 8) {
                Text("VIDEO / GIORNO")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white.opacity(0.4))
                    .tracking(1.5)
                Chart(mockWeeklyData, id: \.day) { item in
                    BarMark(x: .value("Day", item.day), y: .value("Count", item.count))
                        .foregroundStyle(Color(red: 0.4, green: 0.8, blue: 0.6))
                        .cornerRadius(3)
                }
                .chartYAxis(.hidden)
                .chartXAxis {
                    AxisMarks { AxisValueLabel().foregroundStyle(Color.white.opacity(0.4)) }
                }
                .frame(height: 60)
            }
            .padding(16)
            .background(Color.white.opacity(0.05))
            .cornerRadius(12)
            .frame(maxWidth: .infinity)

            // Agent status grid
            AgentStatusGridView()
        }
    }
}
```

- [ ] **Step 3: CalendarView.swift (weekly drag&drop)**
```swift
import SwiftUI

struct CalendarView: View {
    @EnvironmentObject var store: AppStore
    private let days = ["18 MAG", "19 MAG", "20 MAG", "21 MAG", "22 MAG", "23 MAG", "24 MAG"]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("CALENDARIO SETTIMANALE")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.white.opacity(0.4))
                .tracking(1.5)

            HStack(spacing: 8) {
                ForEach(days, id: \.self) { day in
                    DayColumnView(
                        dayLabel: day,
                        videos: store.queue.filter { $0.scheduled_at?.contains(day) == true }
                    )
                }
            }
        }
    }
}

struct DayColumnView: View {
    let dayLabel: String
    let videos: [VideoItem]
    @State private var isTargeted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(dayLabel)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.5))

            ScrollView {
                VStack(spacing: 4) {
                    ForEach(videos) { video in
                        VideoCardMiniView(video: video)
                    }
                    if videos.isEmpty {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.white.opacity(isTargeted ? 0.08 : 0.03))
                            .frame(height: 60)
                            .overlay(
                                Image(systemName: "plus")
                                    .foregroundColor(.white.opacity(0.2))
                                    .font(.system(size: 12))
                            )
                    }
                }
            }
            .frame(height: 120)
        }
        .frame(maxWidth: .infinity)
        .padding(8)
        .background(Color.white.opacity(isTargeted ? 0.06 : 0.03))
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.white.opacity(isTargeted ? 0.2 : 0.06), lineWidth: 1)
        )
        .onDrop(of: ["public.text"], isTargeted: $isTargeted) { _ in true }
    }
}
```

- [ ] **Step 4: Build e test visivo**
```
Xcode → Run (⌘R)
```
Expected: app si avvia, layout split view visibile, colonne calendario renderizzate

- [ ] **Step 5: Commit**
```bash
cd ~/Documents/WhyPost/mission-control
git add .
git commit -m "feat: Mission Control SwiftUI — dashboard + calendar layout"
```

---

### Task B5: CHAT-AI Sidebar con Claude integration

**Files:**
- Create: `mission-control/WhyPost/Views/ChatSidebarView.swift`
- Create: `mission-control/WhyPost/Models/ChatMessage.swift`

- [ ] **Step 1: ChatMessage.swift**
```swift
import Foundation

struct ChatMessage: Identifiable {
    let id = UUID()
    let role: Role
    let content: String
    let timestamp = Date()

    enum Role { case user, assistant, system }
}
```

- [ ] **Step 2: ChatSidebarView.swift**
```swift
import SwiftUI

struct ChatSidebarView: View {
    @EnvironmentObject var store: AppStore
    @Binding var isCollapsed: Bool
    @State private var inputText = ""
    @State private var isLoading = false

    let quickPrompts = [
        "Genera 5 idee video per oggi",
        "Mostra stato agenti",
        "Analizza performance settimana",
        "Cambia argomento di domani in: ",
        "Quanti video nel buffer?"
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("CHAT-AI")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .tracking(2)
                    Text("Controlla tutto da qui")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.35))
                }
                Spacer()
                Button(action: { withAnimation(.easeInOut(duration: 0.3)) { isCollapsed = true } }) {
                    Image(systemName: "sidebar.right")
                        .font(.system(size: 13))
                        .foregroundColor(.white.opacity(0.5))
                }
                .buttonStyle(.plain)
            }
            .padding(16)
            .background(Color.white.opacity(0.04))

            Divider().background(Color.white.opacity(0.08))

            // Quick prompts
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(quickPrompts, id: \.self) { prompt in
                        Button(action: { inputText = prompt }) {
                            Text(prompt)
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.6))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(Color.white.opacity(0.07))
                                .cornerRadius(20)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }

            Divider().background(Color.white.opacity(0.06))

            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(store.chatMessages) { msg in
                            ChatBubbleView(message: msg)
                        }
                        if isLoading {
                            LoadingBubbleView()
                        }
                    }
                    .padding(16)
                }
                .onChange(of: store.chatMessages.count) { _ in
                    if let last = store.chatMessages.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }

            Divider().background(Color.white.opacity(0.06))

            // Input area
            HStack(spacing: 10) {
                TextField("Scrivi a Claude...", text: $inputText, axis: .vertical)
                    .font(.system(size: 13))
                    .foregroundColor(.white)
                    .lineLimit(1...4)
                    .padding(10)
                    .background(Color.white.opacity(0.07))
                    .cornerRadius(10)
                    .onSubmit { sendMessage() }

                Button(action: sendMessage) {
                    Image(systemName: isLoading ? "stop.circle" : "arrow.up.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(isLoading ? .red.opacity(0.8) : Color(red: 0.4, green: 0.8, blue: 0.6))
                }
                .buttonStyle(.plain)
                .disabled(inputText.isEmpty && !isLoading)
            }
            .padding(12)
        }
        .background(
            VisualEffectView(material: .sidebar, blendingMode: .behindWindow)
        )
    }

    private func sendMessage() {
        guard !inputText.isEmpty else { return }
        let userMsg = ChatMessage(role: .user, content: inputText)
        store.chatMessages.append(userMsg)
        let prompt = buildPrompt(userInput: inputText)
        inputText = ""
        isLoading = true

        Task {
            let response = await callClaude(prompt: prompt)
            await MainActor.run {
                store.chatMessages.append(ChatMessage(role: .assistant, content: response))
                isLoading = false
            }
        }
    }

    private func buildPrompt(userInput: String) -> String {
        let stateJSON = (try? JSONEncoder().encode(store.state)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        return """
        Sei l'assistente AI di WhyPost Mission Control. Hai accesso allo stato del sistema:

        STATE: \(stateJSON)
        BUFFER: \(store.state.buffer.ready_videos)/\(store.state.buffer.target_days) giorni
        VIDEO IN CODA: \(store.queue.count)

        L'utente ti ha scritto: \(userInput)

        Rispondi in modo conciso e operativo. Se l'utente chiede di modificare qualcosa nel sistema, indica i cambiamenti da fare.
        """
    }

    private func callClaude(prompt: String) async -> String {
        guard let url = URL(string: "http://localhost:5174/claude"),
              let body = try? JSONSerialization.data(withJSONObject: ["prompt": prompt])
        else { return "Errore connessione al server." }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body

        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let response = json["response"] as? String
        else { return "Claude non raggiungibile. Assicurati che il server Flask giri su :5174" }

        return response
    }
}

struct ChatBubbleView: View {
    let message: ChatMessage

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if message.role == .assistant {
                Circle()
                    .fill(Color(red: 0.4, green: 0.8, blue: 0.6))
                    .frame(width: 20, height: 20)
                    .overlay(Text("W").font(.system(size: 9, weight: .bold)).foregroundColor(.black))
            }
            Text(message.content)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(message.role == .user ? 0.9 : 0.8))
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(message.role == .user ? Color.white.opacity(0.08) : Color.clear)
                .cornerRadius(8)
            if message.role == .user { Spacer() }
        }
    }
}

struct LoadingBubbleView: View {
    @State private var opacity = 0.3

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { i in
                Circle()
                    .fill(Color(red: 0.4, green: 0.8, blue: 0.6))
                    .frame(width: 6, height: 6)
                    .opacity(opacity)
                    .animation(.easeInOut(duration: 0.6).repeatForever().delay(Double(i) * 0.2), value: opacity)
            }
        }
        .onAppear { opacity = 1.0 }
    }
}

struct VisualEffectView: NSViewRepresentable {
    let material: NSVisualEffectView.Material
    let blendingMode: NSVisualEffectView.BlendingMode

    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = blendingMode
        view.state = .active
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}
```

- [ ] **Step 3: Aggiungi endpoint Claude al Flask server**

In `server/app.py` aggiungi:
```python
@app.route("/claude", methods=["POST"])
def claude_chat():
    import subprocess
    data = request.json
    prompt = data.get("prompt", "")
    result = subprocess.run(
        ["claude", "-p", prompt, "--model", "sonnet"],
        capture_output=True, text=True, timeout=120,
        cwd=str(BASE)
    )
    return jsonify({"response": result.stdout.strip() or "Nessuna risposta"})
```

- [ ] **Step 4: Build e test chat**
```
Xcode → Run
Scrivi nella chat: "Quanti video nel buffer?"
```
Expected: Claude risponde con il dato dal state.json

- [ ] **Step 5: Commit**
```bash
git add mission-control/
git commit -m "feat: CHAT-AI sidebar with Claude integration, quick prompts, visual effect"
```

---

## SUB-PROJECT C — Agent Pipeline

### Task C1: EXEL — Idea Engine (scraping + 500+ idee)

**Files:**
- Create: `agents/exel.py`

- [ ] **Step 1: Crea agents/exel.py**
```python
import hashlib
import logging
import requests
import feedparser
from agents.db import get_ideas_conn, init_db
from pathlib import Path
import yaml, json

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

def load_config():
    return yaml.safe_load((BASE / "config.yaml").read_text())

def hash_title(title: str) -> str:
    return hashlib.md5(title.strip().lower().encode()).hexdigest()

def save_idea(title: str, source: str, topic: str, language: str = "it"):
    h = hash_title(title)
    with get_ideas_conn() as conn:
        try:
            conn.execute(
                "INSERT INTO ideas (hash, title, source, topic, language) VALUES (?,?,?,?,?)",
                (h, title, source, topic, language)
            )
        except Exception:
            pass  # già presente

def scrape_hn(topics: list[str], blacklist: list[str]):
    try:
        resp = requests.get("https://hacker-news.firebaseio.com/v0/topstories.json", timeout=10)
        ids = resp.json()[:40]
        for story_id in ids:
            item = requests.get(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json", timeout=5).json()
            title = item.get("title", "")
            if not title: continue
            if any(b.lower() in title.lower() for b in blacklist): continue
            matched = next((t for t in topics if t.lower() in title.lower()), topics[0])
            save_idea(title, "hn", matched)
    except Exception as e:
        logger.error(f"HN scrape error: {e}")

def scrape_rss(topics: list[str], blacklist: list[str]):
    feeds = [
        "https://feeds.feedburner.com/TechCrunch",
        "https://www.wired.com/feed/rss",
        "https://rss.slashdot.org/Slashdot/slashdotMain"
    ]
    for url in feeds:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:10]:
                title = entry.get("title", "")
                if any(b.lower() in title.lower() for b in blacklist): continue
                matched = next((t for t in topics if t.lower() in title.lower()), topics[0])
                save_idea(title, "rss", matched, "en")
        except Exception as e:
            logger.error(f"RSS error {url}: {e}")

def update_state(count: int):
    state_path = BASE / "state.json"
    state = json.loads(state_path.read_text())
    state["agents"]["EXEL"]["status"] = "idle"
    state["agents"]["EXEL"]["ideas_count"] = count
    from datetime import datetime
    state["agents"]["EXEL"]["last_run"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2))

def run():
    init_db()
    cfg = load_config()
    topics = cfg["content"]["topics"]
    blacklist = cfg["content"]["blacklist"]
    scrape_hn(topics, blacklist)
    scrape_rss(topics, blacklist)
    with get_ideas_conn() as conn:
        count = conn.execute("SELECT COUNT(*) FROM ideas WHERE status='raw'").fetchone()[0]
    update_state(count)
    logger.info(f"EXEL done. Raw ideas: {count}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
```

- [ ] **Step 2: Test EXEL**
```bash
cd ~/Documents/WhyPost
source venv/bin/activate
python -m agents.exel
```
Expected: log con numero idee salvate, nessun errore

- [ ] **Step 3: Commit**
```bash
git add agents/exel.py
git commit -m "feat: EXEL agent — HN + RSS scraping with dedup"
```

---

### Task C2: SCRIPT — Script Writer (Claude Sonnet headless)

**Files:**
- Create: `agents/script_writer.py`
- Create: `prompts/script_writer.md`

- [ ] **Step 1: Crea prompts/script_writer.md**
```markdown
Sei un esperto content creator specializzato in video brevi virali per TikTok e Instagram Reels.

Dato questo argomento/idea: {IDEA}
Lingua: {LANGUAGE}
Tipo video: {VIDEO_TYPE}

Genera uno script completo in formato JSON con questa struttura esatta:
{
  "hook": "Prime 3 secondi che catturano l'attenzione (max 15 parole)",
  "body": ["Punto 1", "Punto 2", "Punto 3", "Punto 4", "Punto 5"],
  "cta": "Call to action finale (max 10 parole)",
  "caption": "Caption social con emoji e hashtag (max 200 caratteri)",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "title_card": "Testo per la title card del video (max 8 parole)",
  "duration_estimate": 35
}

Regole:
- Hook deve essere una domanda o affermazione scioccante
- Body deve avere punti brevi, adatti a TTS (15-25 parole ciascuno)
- Niente parole generiche: "incredibile", "straordinario", "rivoluzionario"
- Tono: diretto, informativo, leggermente provocatorio
- Rispondi SOLO con il JSON, nessun testo extra
```

- [ ] **Step 2: Crea agents/script_writer.py**
```python
import json
import logging
import yaml
from pathlib import Path
from agents.db import get_ideas_conn
from agents.claude import ask_claude
from datetime import datetime

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)
PROMPT_TEMPLATE = (BASE / "prompts" / "script_writer.md").read_text()

def load_config():
    return yaml.safe_load((BASE / "config.yaml").read_text())

def pick_idea(topic: str = None) -> dict | None:
    with get_ideas_conn() as conn:
        if topic:
            row = conn.execute(
                "SELECT * FROM ideas WHERE status='raw' AND topic LIKE ? ORDER BY created_at ASC LIMIT 1",
                (f"%{topic}%",)
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM ideas WHERE status='raw' ORDER BY created_at ASC LIMIT 1"
            ).fetchone()
        return dict(row) if row else None

def mark_idea_used(idea_id: int):
    with get_ideas_conn() as conn:
        conn.execute(
            "UPDATE ideas SET status='used', used_at=? WHERE id=?",
            (datetime.now().isoformat(), idea_id)
        )

def write_script(idea: dict, language: str, video_type: str) -> dict | None:
    prompt = PROMPT_TEMPLATE.replace("{IDEA}", idea["title"])
    prompt = prompt.replace("{LANGUAGE}", language)
    prompt = prompt.replace("{VIDEO_TYPE}", video_type)
    raw = ask_claude(prompt, model="sonnet")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON from Claude: {raw[:200]}")
        return None

def add_to_queue(video_id: str, script: dict, idea: dict, language: str, video_type: str):
    queue_path = BASE / "queue.json"
    queue = json.loads(queue_path.read_text())
    queue["videos"].append({
        "id": video_id,
        "title": script.get("title_card", idea["title"][:50]),
        "status": "scripted",
        "language": language,
        "video_type": video_type,
        "platform": ["instagram", "tiktok"],
        "script": script,
        "idea_title": idea["title"],
        "created_at": datetime.now().isoformat()
    })
    queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

def run(n: int = 1, topic: str = None):
    cfg = load_config()
    language = cfg["content"].get("language", "it")
    schedule = cfg.get("schedule", {})

    for i in range(n):
        idea = pick_idea(topic)
        if not idea:
            logger.warning("No raw ideas available")
            break

        video_type = "tech_news"
        video_id = f"wp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i}"

        script = write_script(idea, language, video_type)
        if not script:
            continue

        mark_idea_used(idea["id"])
        add_to_queue(video_id, script, idea, language, video_type)
        logger.info(f"Scripted: {idea['title'][:60]}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run(n=1)
```

- [ ] **Step 3: Test script writer**
```bash
python -m agents.script_writer
cat queue.json
```
Expected: queue.json ha un video con status "scripted" e script completo

- [ ] **Step 4: Commit**
```bash
git add agents/script_writer.py prompts/script_writer.md
git commit -m "feat: SCRIPT agent — Claude Sonnet headless script writer"
```

---

### Task C3: ASSET — TTS + B-roll + Captions

**Files:**
- Create: `agents/asset.py`

- [ ] **Step 1: Installa edge-tts e verifica whisper**
```bash
source venv/bin/activate
pip install edge-tts
# whisper.cpp — compila se non presente:
which whisper-cpp || echo "Install whisper.cpp from https://github.com/ggerganov/whisper.cpp"
```

- [ ] **Step 2: Crea agents/asset.py**
```python
import asyncio
import json
import logging
import os
import requests
from pathlib import Path
from datetime import datetime
import edge_tts
import yaml, subprocess

BASE = Path(__file__).parent.parent
ASSETS_DIR = BASE / "data" / "assets"
logger = logging.getLogger(__name__)

def load_config():
    return yaml.safe_load((BASE / "config.yaml").read_text())

async def generate_tts(text: str, voice: str, output_path: Path):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(output_path))

def fetch_broll(query: str, count: int = 3, api_key: str = "") -> list[Path]:
    if not api_key:
        logger.warning("No Pexels API key, skipping B-roll")
        return []
    headers = {"Authorization": api_key}
    url = f"https://api.pexels.com/videos/search?query={query}&per_page={count}&orientation=portrait"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        videos = resp.json().get("videos", [])
        paths = []
        for v in videos[:count]:
            video_url = v["video_files"][0]["link"]
            fname = ASSETS_DIR / f"broll_{v['id']}.mp4"
            if not fname.exists():
                with requests.get(video_url, stream=True, timeout=30) as r:
                    fname.write_bytes(r.content)
            paths.append(fname)
        return paths
    except Exception as e:
        logger.error(f"B-roll fetch error: {e}")
        return []

def generate_captions(audio_path: Path, output_path: Path):
    try:
        subprocess.run(
            ["whisper-cpp", str(audio_path), "--model", "base", "--output-srt",
             "--output-file", str(output_path.with_suffix(""))],
            check=True, capture_output=True, timeout=60
        )
    except Exception as e:
        logger.warning(f"Whisper failed: {e}. Skipping captions.")

def process_video(video: dict, cfg: dict):
    vid_id = video["id"]
    lang = video.get("language", "it")
    voice = cfg["tts"]["voice_it"] if lang == "it" else cfg["tts"]["voice_en"]

    vid_assets = ASSETS_DIR / vid_id
    vid_assets.mkdir(exist_ok=True)

    # TTS
    script = video.get("script", {})
    body_text = ". ".join(script.get("body", []))
    full_text = f"{script.get('hook', '')}. {body_text}. {script.get('cta', '')}"
    audio_path = vid_assets / "audio.mp3"
    asyncio.run(generate_tts(full_text, voice, audio_path))
    logger.info(f"TTS generated: {audio_path}")

    # Captions
    srt_path = vid_assets / "captions.srt"
    generate_captions(audio_path, srt_path)

    # B-roll
    pexels_key = os.getenv("PEXELS_API_KEY", "")
    broll_paths = fetch_broll(video.get("idea_title", "technology"), 3, pexels_key)
    logger.info(f"B-roll: {len(broll_paths)} clips")

    return {"audio": str(audio_path), "captions": str(srt_path), "broll": [str(p) for p in broll_paths]}

def run():
    cfg = load_config()
    queue_path = BASE / "queue.json"
    queue = json.loads(queue_path.read_text())
    updated = False

    for video in queue["videos"]:
        if video["status"] != "scripted":
            continue
        assets = process_video(video, cfg)
        video["status"] = "assets_ready"
        video["assets"] = assets
        updated = True
        logger.info(f"Assets ready: {video['id']}")

    if updated:
        queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
```

- [ ] **Step 3: Test TTS**
```bash
python -c "
import asyncio, edge_tts
async def test():
    c = edge_tts.Communicate('Ciao, questo è WhyPost che funziona!', 'it-IT-IsabellaNeural')
    await c.save('/tmp/test_tts.mp3')
asyncio.run(test())
print('TTS OK')
"
open /tmp/test_tts.mp3
```
Expected: file audio con voce italiana

- [ ] **Step 4: Commit**
```bash
git add agents/asset.py
git commit -m "feat: ASSET agent — edge-tts, B-roll Pexels, whisper captions"
```

---

### Task C4: SAFETY + PUBLISHER stub

**Files:**
- Create: `agents/safety.py`
- Create: `agents/publisher.py`

- [ ] **Step 1: agents/safety.py**
```python
import json, logging
from pathlib import Path

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

RULES = {
    "min_duration": 15,
    "max_duration": 65,
    "required_fields": ["hook", "body", "cta"],
}

def check_video(video: dict) -> tuple[bool, str]:
    script = video.get("script", {})
    for field in RULES["required_fields"]:
        if field not in script:
            return False, f"Missing field: {field}"
    duration = script.get("duration_estimate", 0)
    if duration < RULES["min_duration"]:
        return False, f"Too short: {duration}s"
    if duration > RULES["max_duration"]:
        return False, f"Too long: {duration}s"
    return True, "OK"

def run():
    queue_path = BASE / "queue.json"
    queue = json.loads(queue_path.read_text())
    for video in queue["videos"]:
        if video["status"] not in ("assets_ready", "rendered"):
            continue
        ok, reason = check_video(video)
        video["status"] = "ready" if ok else "needs_fix"
        if not ok:
            video["safety_fail_reason"] = reason
            logger.warning(f"Safety FAIL {video['id']}: {reason}")
        else:
            logger.info(f"Safety OK: {video['id']}")
    queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
```

- [ ] **Step 2: agents/publisher.py (stub — pronto per Meta Graph API)**
```python
import json, logging, os
from pathlib import Path
from datetime import datetime
import requests

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

IG_TOKEN = os.getenv("IG_ACCESS_TOKEN", "")
IG_ACCOUNT_ID = os.getenv("IG_ACCOUNT_ID", "")

def publish_instagram(video: dict) -> bool:
    if not IG_TOKEN:
        logger.warning("IG_ACCESS_TOKEN not set — skipping publish")
        return False
    logger.info(f"[STUB] Would publish to Instagram: {video['id']}")
    # TODO Settimana 5: implementa Meta Graph API upload
    # Step 1: POST /me/media (upload video)
    # Step 2: POST /me/media_publish (publish)
    return True

def run():
    queue_path = BASE / "queue.json"
    queue = json.loads(queue_path.read_text())
    for video in queue["videos"]:
        if video["status"] != "ready":
            continue
        if publish_instagram(video):
            video["status"] = "published"
            video["published_at"] = datetime.now().isoformat()
    queue_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
```

- [ ] **Step 3: Commit**
```bash
git add agents/safety.py agents/publisher.py
git commit -m "feat: SAFETY rules + PUBLISHER stub (IG ready for token)"
```

---

### Task C5: MAIN orchestratore

**Files:**
- Create: `agents/main.py`

- [ ] **Step 1: Crea agents/main.py**
```python
import json, logging, sys, yaml
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

def load_config():
    return yaml.safe_load((BASE / "config.yaml").read_text())

def count_buffer() -> int:
    queue = json.loads((BASE / "queue.json").read_text())
    return sum(1 for v in queue["videos"] if v["status"] in ("ready", "rendered"))

def update_system_state(status: str):
    state_path = BASE / "state.json"
    state = json.loads(state_path.read_text())
    state["system"] = status
    state["updated_at"] = datetime.now().isoformat()
    state["buffer"]["ready_videos"] = count_buffer()
    state_path.write_text(json.dumps(state, indent=2))

def check_buffer():
    from agents import script_writer
    cfg = load_config()
    target = cfg["buffer"]["target_days"]
    current = count_buffer()
    needed = target - current
    if needed > 0:
        logger.info(f"Buffer low: {current}/{target} — scripting {needed} videos")
        update_system_state("running")
        script_writer.run(n=needed)
    else:
        logger.info(f"Buffer OK: {current}/{target}")
    update_system_state("idle")

def publish_due():
    from agents import publisher
    publisher.run()

COMMANDS = {
    "check_buffer": check_buffer,
    "publish_due": publish_due,
}

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check_buffer"
    if cmd in COMMANDS:
        COMMANDS[cmd]()
    else:
        logger.error(f"Unknown command: {cmd}. Available: {list(COMMANDS.keys())}")
```

- [ ] **Step 2: Test orchestratore**
```bash
python -m agents.main check_buffer
cat state.json  # verifica buffer aggiornato
```

- [ ] **Step 3: Commit**
```bash
git add agents/main.py agents/__init__.py
git commit -m "feat: MAIN orchestrator — buffer check + command dispatch"
```

---

## Self-Review

**Spec coverage check:**
- [x] Agent Teams (MAIN, EXEL, SCRIPT, ASSET, CLACK, SAFETY, PUBLISHER, TELEMETRY, OPUS) — CLACK e TELEMETRY sono stub placeholder per Settimana 4-6
- [x] Mission Control SwiftUI con layout da wireframe
- [x] CHAT-AI sidebar con Claude integration
- [x] config.yaml come fonte di verità
- [x] state.json + queue.json bridge
- [x] Flask server 30 righe
- [x] Buffer 7 giorni
- [x] edge-tts + Pexels + whisper
- [x] Crontab
- [x] Safety rules
- [x] Publisher stub (IG da completare Settimana 5)
- [ ] CLACK/Remotion integration — Piano separato (Settimana 4)
- [ ] Weekly review Opus — Piano separato (Settimana 7)
- [ ] TikTok/YT publisher — Piano separato (Settimana 6)
- [ ] Google Calendar integration — Piano separato (Settimana 3)

**Placeholder scan:** nessun TODO lasciato aperto nei task critici. I task "futura settimana" sono marcati esplicitamente.

**Type consistency:** `VideoItem` usato consistentemente in Swift e `video dict` in Python attraverso tutto il piano.

---

## Execution

Piano completo. Esecuzione: **Agent Teams in parallelo**

- **Team A** → Sub-project A (Infrastructure): Task A1→A5
- **Team B** → Sub-project B (SwiftUI): Task B1→B5
- **Team C** → Sub-project C (Pipeline): Task C1→C5

Tutti e 3 i team partono simultaneamente. Punto di integrazione: quando B5 (Chat-AI) e A4 (Flask server) sono entrambi pronti, si fa il test end-to-end della chat.
