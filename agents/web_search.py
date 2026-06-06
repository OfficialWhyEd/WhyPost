# agents/web_search.py
# Modulo di ricerca web condiviso. Ogni agente ha un profilo specializzato.
# Usa ddgs (DuckDuckGo) — nessuna API key richiesta.

import json
import logging
import subprocess
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    from ddgs import DDGS
except ImportError:
    DDGS = None

# ─── Profili agente ─────────────────────────────────────────────────────────
# Ogni agente ha query specializzate + contesto per Claude.

AGENT_PROFILES = {
    "EXEL": {
        "description": "Trova argomenti trending e virali per contenuti TikTok/IG tech e AI",
        "queries": [
            "viral tiktok topics tech AI 2025 trending",
            "argomenti virali instagram reels tech italia 2025",
            "top trending AI topics social media this week",
            "viral science tech tiktok topics right now",
            "trending technology news for short videos",
        ],
        "news_queries": [
            "AI breakthrough news this week",
            "technology viral news today",
            "scienza tecnologia notizie virali settimana",
        ],
    },
    "SCRIPT": {
        "description": "Cerca info aggiornate su un argomento specifico per scrivere script accurati",
        "queries": [],  # dinamiche per argomento
        "context": "informazioni recenti accurate per uno script video breve",
    },
    "CLACK": {
        "description": "Trova template Remotion virali, video TikTok trending, nuove tecniche editing",
        "queries": [
            "best remotion video template 2025 github",
            "tiktok viral editing technique 2025",
            "instagram reels editing style viral creators",
            "remotion animated captions word reveal github",
            "viral short video motion graphics template open source",
        ],
    },
    "PUBLISHER": {
        "description": "Cerca migliori orari e hashtag per pubblicazione TikTok/IG",
        "queries": [
            "best time to post tiktok 2025",
            "trending hashtags tech tiktok instagram 2025",
            "instagram reels algorithm 2025 tips",
        ],
    },
}


# ─── Core search ────────────────────────────────────────────────────────────

def search(query: str, max_results: int = 6, region: str = "it-it") -> list[dict]:
    """Esegue una ricerca web. Restituisce [{title, url, body}]."""
    if DDGS is None:
        logger.error("[WEB] ddgs non installato — pip install ddgs")
        return []
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, region=region, max_results=max_results))
        return [{"title": r.get("title", ""), "url": r.get("href", ""), "body": r.get("body", "")} for r in results]
    except Exception as e:
        logger.warning(f"[WEB] Search error '{query}': {e}")
        return []

def search_news(query: str, max_results: int = 5) -> list[dict]:
    """Cerca notizie recenti."""
    if DDGS is None:
        return []
    try:
        with DDGS() as ddgs:
            results = list(ddgs.news(query, max_results=max_results))
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "body": r.get("body", ""),
                "date": r.get("date", ""),
                "source": r.get("source", ""),
            }
            for r in results
        ]
    except Exception as e:
        logger.warning(f"[WEB] News error '{query}': {e}")
        return []

def search_viral_videos(platform: str = "tiktok", niche: str = "tech AI") -> list[dict]:
    """Cerca video virali recenti su una piattaforma. Restituisce metadata URL."""
    queries = [
        f"site:tiktok.com {niche} viral 2025" if platform == "tiktok"
        else f"site:instagram.com/reel {niche} viral 2025",
        f"{platform} {niche} most viewed video 2025",
        f"{niche} viral short video creator 2025",
    ]
    results = []
    for q in queries[:2]:
        results.extend(search(q, max_results=4))
    return results


# ─── Agent-specific helpers ─────────────────────────────────────────────────

def get_trending_topics(lang: str = "it", count: int = 10) -> list[str]:
    """Restituisce argomenti trending per video short-form. Usato da EXEL."""
    profile = AGENT_PROFILES["EXEL"]
    all_results = []

    for q in profile["queries"][:3]:
        all_results.extend(search_news(q, max_results=4))
    for q in profile["news_queries"][:2]:
        all_results.extend(search_news(q, max_results=4))

    if not all_results:
        return []

    # Usa Claude per estrarre argomenti virali dalla lista risultati
    summary = "\n".join(
        f"- {r['title']} ({r.get('date', '')}): {r['body'][:120]}"
        for r in all_results[:20]
    )
    lang_instruction = "in italiano" if lang == "it" else "in English"
    try:
        result = subprocess.run(
            ["claude", "-p",
             f"Sei un esperto di contenuti virali TikTok/Instagram. "
             f"Analizza questi titoli di notizie recenti e identifica {count} argomenti "
             f"perfetti per video virali short-form tech/AI {lang_instruction}.\n\n"
             f"{summary}\n\n"
             f"Rispondi SOLO con una lista JSON: [\"argomento 1\", \"argomento 2\", ...]"
             f"Sii specifico e attuale, non generico. Priorità: novità, sorpresa, utilità."],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            text = result.stdout.strip()
            start = text.find("[")
            end = text.rfind("]") + 1
            if start >= 0 and end > start:
                topics = json.loads(text[start:end])
                logger.info(f"[WEB] {len(topics)} argomenti trending trovati")
                return topics[:count]
    except Exception as e:
        logger.warning(f"[WEB] Claude topic extraction: {e}")

    # Fallback: prendi i titoli grezzi
    return [r["title"] for r in all_results[:count] if r.get("title")]

def get_topic_context(topic: str, lang: str = "it") -> str:
    """Cerca info aggiornate su un argomento. Usato da SCRIPT prima di scrivere."""
    results = search_news(f"{topic} 2025 latest news", max_results=5)
    if not results:
        results = search(f"{topic} explained 2025", max_results=4)

    if not results:
        return ""

    context = "\n".join(
        f"[{r.get('source', r.get('url', '')[:40])}] {r['title']}: {r['body'][:200]}"
        for r in results[:6]
    )
    logger.info(f"[WEB] Contesto trovato per '{topic}': {len(results)} fonti")
    return context

def get_clack_updates() -> dict:
    """Cerca nuovi template Remotion e tecniche editing virali. Usato da CLACK."""
    profile = AGENT_PROFILES["CLACK"]
    templates = []
    techniques = []

    for q in profile["queries"][:3]:
        results = search(q, max_results=4)
        for r in results:
            url = r.get("url", "")
            if "github.com" in url:
                templates.append({"title": r["title"], "url": url, "body": r["body"][:150]})
            else:
                techniques.append({"title": r["title"], "url": url, "body": r["body"][:150]})

    return {
        "new_templates": templates[:8],
        "new_techniques": techniques[:8],
        "searched_at": datetime.now().isoformat(),
    }

def get_publisher_intel() -> dict:
    """Cerca timing e hashtag ottimali per pubblicazione. Usato da PUBLISHER."""
    profile = AGENT_PROFILES["PUBLISHER"]
    results = []
    for q in profile["queries"]:
        results.extend(search(q, max_results=3))

    return {
        "results": results[:10],
        "searched_at": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [WEB] %(message)s")

    parser = argparse.ArgumentParser()
    parser.add_argument("--topics", action="store_true", help="Mostra trending topics")
    parser.add_argument("--context", metavar="TOPIC", help="Cerca contesto su un argomento")
    parser.add_argument("--clack", action="store_true", help="Cerca update per CLACK")
    args = parser.parse_args()

    if args.topics:
        topics = get_trending_topics()
        print(json.dumps(topics, indent=2, ensure_ascii=False))
    elif args.context:
        ctx = get_topic_context(args.context)
        print(ctx)
    elif args.clack:
        upd = get_clack_updates()
        print(json.dumps(upd, indent=2, ensure_ascii=False))
    else:
        parser.print_help()
