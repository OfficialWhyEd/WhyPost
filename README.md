<p align="center">
  <img src="assets/banner.png" alt="WhyPost" width="100%"/>
</p>

<p align="center">
  <a href="https://github.com/OfficialWhyEd/WhyPost/stargazers"><img src="https://img.shields.io/github/stars/OfficialWhyEd/WhyPost?style=flat-square&color=863bff&label=Stars" alt="GitHub Stars" /></a>
  <a href="https://discord.gg/cQQckfnN"><img src="https://img.shields.io/badge/Discord-Join-863bff?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://instagram.com/whyed.music"><img src="https://img.shields.io/badge/Instagram-@whyed.music-863bff?style=flat-square&logo=instagram&logoColor=white" /></a>
  <a href="https://officialwhyed.github.io/WhyPost"><img src="https://img.shields.io/badge/Website-Live-863bff?style=flat-square&logo=github&logoColor=white" /></a>
  <img src="https://img.shields.io/badge/status-production-brightgreen?style=flat-square" />
</p>

<br/>

> **WhyPost** is a fully autonomous content factory. 10 cron jobs. 5 AI agents. Posts every day to Instagram, TikTok, and YouTube. Zero Anthropic API costs — uses Claude Pro CLI as a subprocess, not the API.

---

## Philosophy

### Zero cost
WhyPost uses **Claude Code CLI** — the same $20/month Claude Pro subscription you already have — invoked headlessly as a subprocess. No API key. No per-token billing. The same intelligence at zero marginal cost. This is the core insight that makes the whole system economically viable.

### Daily autopilot
10 cron jobs fire every morning without you touching anything. The pipeline executes, posts go live, performance gets logged. You check your analytics after the fact.

### Multi-platform
One script becomes three formats — a vertical Instagram Story, a YouTube Short, and a TikTok — each optimized for that platform's algorithm, aspect ratio, and caption style.

### Karaoke engine
Remotion renders word-by-word karaoke captions synced to the millisecond. Not burned-in subtitles. Proper motion-graphics captions that match the audio beat for beat.

### AI orchestration
Five separate agents, each specialized, each independent. EXEL mines ideas. Script Writer writes. CLACK renders. Publisher posts. Calendar plans. Each one upgradeable without touching the others.

---

## What it does every morning

| Time | Cron job | What happens |
|------|----------|--------------|
| 09:00 | `exel_scan` | EXEL crawls Reddit for viral topics in the last 24h |
| 09:01 | `exel_score` | Topics scored by engagement + trend velocity |
| 09:03 | `script_write` | Script Writer generates a 47-second platform-optimized script via Claude CLI |
| 09:05 | `script_review` | Script reviewed for hook density and B-roll cue placement |
| 09:06 | `clack_render` | CLACK Director renders karaoke video in Remotion at 120fps |
| 09:10 | `clack_encode` | FFmpeg encodes separate files for IG, TikTok, YouTube specs |
| 09:12 | `quality_gate` | Quality check — rejects below 90% score, re-queues |
| 09:13 | `publish_ig` | Publisher uploads to Instagram with caption + hashtags |
| 09:13 | `publish_tiktok` | Publisher uploads to TikTok with trending audio hook |
| 09:14 | `publish_yt` | Publisher uploads to YouTube Shorts with SEO title |
| 09:15 | `calendar_log` | Calendar Agent logs performance, updates weekly queue |

---

## Pipeline

```
EXEL (idea engine) → Script Writer → CLACK Director → Publisher → Calendar Agent
       ↑                                                                  ↓
  Reddit + trends                                          IG · TikTok · YouTube
```

| Agent | Role |
|-------|------|
| **EXEL** | Crawls Reddit, scores topics by viral potential, queues the winner |
| **Script Writer** | Claude Pro CLI writes 45–60s scripts with hook analysis and B-roll cues |
| **CLACK Director** | Remotion renders karaoke video + FFmpeg encodes per-platform |
| **Publisher** | Quality gate + uploads to IG/TikTok/YouTube with metadata |
| **Calendar Agent** | Logs performance, plans the week, manages the queue backlog |

---

<p align="center">
  <img src="assets/screenshot-mission-control.png" alt="Mission Control Dashboard" width="100%"/>
</p>

---

## Why this is different

| | Buffer / Hootsuite | Hiring a content team | ChatGPT plugins | **WhyPost** |
|---|---|---|---|---|
| Cost | $15–$120/mo | $3k–$8k/mo | ~$20/mo API | **$0 extra** (Claude Pro) |
| Video production | No | Yes | No | **Yes — karaoke engine** |
| Fully automated | Scheduling only | No | No | **Yes — 10 cron jobs** |
| Local / private | No (cloud) | No | No | **Yes — runs on your Mac** |
| Customizable | Limited | Yes | Limited | **Fully open source** |

---

## Features

- **10 cron jobs active** — posts every day without manual intervention
- **Remotion karaoke engine** — word-level captions synced to the millisecond
- **Mission Control** — React dashboard, 7 pages, real-time pipeline visibility
- **B-roll automatic** — Pexels + Pixabay fallback, selected by topic relevance
- **Multi-platform** — format and metadata optimized per channel
- **Zero Anthropic API costs** — Claude Code CLI (`claude --print`), not the API
- **Performance memory** — SQLite tracks what performs, EXEL weights future topics accordingly

---

## Stack

- **Backend**: Python + Flask on `:5174`
- **Frontend**: React + Vite (Mission Control, 7 pages)
- **Video**: Remotion + FFmpeg
- **AI**: Claude Code CLI · Gemini Flash · Groq
- **Storage**: SQLite + JSON queue (local)
- **Scheduling**: crontab macOS (10 jobs)

---

## Setup

```bash
git clone https://github.com/OfficialWhyEd/WhyPost
cd WhyPost

python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cd web && npm install && cd ..

cp .env.example .env
# Edit .env: IG_ACCESS_TOKEN, TT_ACCESS_TOKEN, PEXELS_API_KEY

# Install cron jobs
bash setup_cron.sh

# Start manually (cron runs automatically at 9am)
python3 server/app.py &
cd web && npm run dev
```

---

## Structure

```
WhyPost/
├── agents/           # EXEL, ScriptWriter, CLACK, Publisher, Calendar
├── server/           # Flask API + routes
├── web/              # React Mission Control (7 pages)
├── remotion/         # Karaoke video templates
├── prompts/          # System prompts for each agent
├── data/             # SQLite DB, queue, state
├── scripts/          # Utilities
└── setup_cron.sh     # Installs all 10 cron jobs
```

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=OfficialWhyEd/WhyPost&type=Date)](https://star-history.com/#OfficialWhyEd/WhyPost&Date)

---

## Spread the word

If WhyPost is useful to you, share it where it belongs:

- **Discord**: [discord.gg/cQQckfnN](https://discord.gg/cQQckfnN) — show what your pipeline is producing
- **Instagram**: [instagram.com/whyed.music](https://instagram.com/whyed.music) — tag @whyed.music
- **Reddit**: [r/automation](https://reddit.com/r/automation) · [r/LocalLLaMA](https://reddit.com/r/LocalLLaMA) · [r/Python](https://reddit.com/r/Python)

---

## Contributing

WhyPost is open source and built to be extended. Each agent is a standalone Python module — drop in a new one, wire it to the Flask API, add a cron entry.

Good first contributions:
- New platform integrations (Pinterest, LinkedIn)
- Additional Remotion video templates
- EXEL scoring improvements (YouTube trending, Twitter/X)
- Mission Control UI enhancements

Open an issue or a PR. The pipeline runs every day either way.

---

<p align="center">Built by <a href="https://github.com/OfficialWhyEd">@whyed</a> &middot; macOS &middot; local-first &middot; no Anthropic API key needed</p>
