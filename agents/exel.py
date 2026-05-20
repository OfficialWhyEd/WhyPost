# ~/Documents/WhyPost/agents/exel.py
import hashlib
import logging
import json
import requests
import feedparser
import yaml
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)

def load_config():
    return yaml.safe_load((BASE / "config.yaml").read_text())

def hash_title(title: str) -> str:
    return hashlib.md5(title.strip().lower().encode()).hexdigest()

def get_ideas_conn():
    import sqlite3
    conn = sqlite3.connect(BASE / "data" / "ideas.db")
    conn.row_factory = sqlite3.Row
    return conn

def save_idea(title: str, source: str, topic: str, language: str = "it"):
    h = hash_title(title)
    try:
        with get_ideas_conn() as conn:
            conn.execute(
                "INSERT INTO ideas (hash, title, source, topic, language) VALUES (?,?,?,?,?)",
                (h, title.strip(), source, topic, language)
            )
    except Exception:
        pass  # duplicato

def scrape_hn(topics: list, blacklist: list):
    try:
        resp = requests.get(
            "https://hacker-news.firebaseio.com/v0/topstories.json",
            timeout=10
        )
        ids = resp.json()[:50]
        saved = 0
        for story_id in ids[:30]:
            try:
                item = requests.get(
                    f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json",
                    timeout=5
                ).json()
                title = item.get("title", "")
                if not title or len(title) < 10:
                    continue
                if any(b.lower() in title.lower() for b in blacklist):
                    continue
                matched = next((t for t in topics if t.lower() in title.lower()), topics[0] if topics else "tech")
                save_idea(title, "hn", matched, "en")
                saved += 1
            except Exception:
                continue
        logger.info(f"HN: salvate {saved} idee")
    except Exception as e:
        logger.error(f"HN error: {e}")

def scrape_rss(topics: list, blacklist: list):
    feeds = [
        ("https://feeds.feedburner.com/TechCrunch", "en"),
        ("https://www.wired.com/feed/rss", "en"),
        ("https://rss.slashdot.org/Slashdot/slashdotMain", "en"),
    ]
    for url, lang in feeds:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:15]:
                title = entry.get("title", "")
                if not title:
                    continue
                if any(b.lower() in title.lower() for b in blacklist):
                    continue
                matched = next((t for t in topics if t.lower() in title.lower()), topics[0] if topics else "tech")
                save_idea(title, "rss", matched, lang)
        except Exception as e:
            logger.warning(f"RSS error {url}: {e}")

def update_state(count: int):
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
    except Exception:
        state = {"agents": {}}
    state.setdefault("agents", {}).setdefault("EXEL", {})
    state["agents"]["EXEL"].update({
        "status": "idle",
        "ideas_count": count,
        "last_run": datetime.now().isoformat()
    })
    state["updated_at"] = datetime.now().isoformat()
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False))

def run():
    cfg = load_config()
    topics = cfg.get("content", {}).get("topics", ["tech ai"])
    blacklist = cfg.get("content", {}).get("blacklist", [])

    # Aggiorna stato a running
    state_path = BASE / "state.json"
    try:
        state = json.loads(state_path.read_text())
        state["agents"]["EXEL"]["status"] = "running"
        state_path.write_text(json.dumps(state, indent=2))
    except Exception:
        pass

    scrape_hn(topics, blacklist)
    scrape_rss(topics, blacklist)

    with get_ideas_conn() as conn:
        count = conn.execute("SELECT COUNT(*) FROM ideas WHERE status='raw'").fetchone()[0]

    update_state(count)
    logger.info(f"EXEL completato. Idee raw disponibili: {count}")
    return count

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [EXEL] %(message)s")
    run()
