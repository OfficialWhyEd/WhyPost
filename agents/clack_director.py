#!/usr/bin/env python3
# agents/clack_director.py
#
# CLACK Director — ricerca autonoma + risponde ai messaggi utente.
# Gira in background (subprocess) quando:
#   1. L'utente manda un messaggio/URL nella CLACK Director Page
#   2. Viene invocato dalla pipeline clack.py dopo ogni render
#   3. Crontab giornaliero per ricerca autonoma
#
# Tutto quello che trova viene scritto in data/clack_feed.json
# come messaggi permanenti, visibili nella chat CLACK Director.
#
import argparse
import json
import logging
import re
import shutil
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).parent.parent
FEED_PATH = BASE / "data" / "clack_feed.json"
MEM_PATH  = BASE / "data" / "clack_memory.json"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [CLACK-DIRECTOR] %(message)s")
logger = logging.getLogger(__name__)

# ── Feed helpers ──────────────────────────────────────────────────────────────

def _load_feed() -> dict:
    try:
        return json.loads(FEED_PATH.read_text()) if FEED_PATH.exists() else {"messages": []}
    except Exception:
        return {"messages": []}


def _save_feed(feed: dict):
    FEED_PATH.parent.mkdir(parents=True, exist_ok=True)
    FEED_PATH.write_text(json.dumps(feed, indent=2, ensure_ascii=False))


def _notify_macos(title: str, body: str):
    """Notifica macOS nativa — funziona anche col browser chiuso."""
    try:
        subprocess.run(
            ["osascript", "-e",
             f'display notification "{body[:100]}" with title "WhyClack" subtitle "{title}"'],
            timeout=5, capture_output=True,
        )
    except Exception:
        pass


def post_message(
    text: str,
    msg_type: str = "discovery",
    url: str | None = None,
    url_title: str | None = None,
    tags: list[str] | None = None,
    notify: bool = True,
):
    """Aggiunge un messaggio di CLACK al feed permanente + notifica macOS."""
    feed = _load_feed()
    msg = {
        "id": str(uuid.uuid4()),
        "type": msg_type,
        "from": "CLACK",
        "text": text,
        "timestamp": datetime.now().isoformat(),
        "unread": True,
    }
    if url:
        msg["url"] = url
        msg["url_title"] = url_title or url
    if tags:
        msg["tags"] = tags
    feed["messages"].append(msg)
    # Mantieni max 500 messaggi
    if len(feed["messages"]) > 500:
        feed["messages"] = feed["messages"][-500:]
    _save_feed(feed)
    logger.info(f"[feed] {msg_type}: {text[:80]}")

    # Notifica macOS solo per messaggi rilevanti (non "sistema")
    type_labels = {
        "discovery": "SCOPERTA", "suggestion": "SUGGERIMENTO",
        "analysis": "ANALISI", "viral": "VIRAL", "url_analysis": "URL ANALISI",
    }
    if notify and msg_type in type_labels:
        _notify_macos(type_labels[msg_type], text[:100])


# ── Memory ────────────────────────────────────────────────────────────────────

def _load_mem() -> dict:
    try:
        return json.loads(MEM_PATH.read_text()) if MEM_PATH.exists() else {}
    except Exception:
        return {}


def _save_mem(mem: dict):
    MEM_PATH.parent.mkdir(parents=True, exist_ok=True)
    MEM_PATH.write_text(json.dumps(mem, indent=2, ensure_ascii=False))


def remember(key: str, value: dict):
    """Salva in memoria permanente CLACK."""
    mem = _load_mem()
    mem.setdefault("director_notes", {})[key] = {
        **value,
        "saved_at": datetime.now().isoformat(),
    }
    _save_mem(mem)


# ── Web search ────────────────────────────────────────────────────────────────

def _search(query: str, max_results: int = 5) -> list[dict]:
    try:
        sys.path.insert(0, str(BASE))
        from agents.web_search import search
        return search(query, max_results=max_results)
    except Exception as e:
        logger.warning(f"Search skip: {e}")
        return []


# ── URL analysis with Claude ──────────────────────────────────────────────────

def _analyze_url(url: str) -> dict:
    """
    Scarica il contenuto della URL e lo fa analizzare da Claude headless.
    Ritorna {"summary": str, "techniques": [str], "tags": [str]}.
    """
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        html = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", errors="ignore")
        # Rimuovi HTML tags
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()[:6000]
    except Exception as e:
        logger.warning(f"URL fetch skip: {e}")
        return {}

    prompt = f"""Analizza questo contenuto (da {url}) che riguarda tecniche di video editing, template o metodi per creare video virali.

Contenuto:
{text}

Rispondi SOLO con JSON valido:
{{
  "summary": "Cosa descrive questa pagina in 2-3 frasi",
  "techniques": ["tecnica 1", "tecnica 2", "tecnica 3"],
  "applicable_to_clack": true/false,
  "how_to_apply": "Come CLACK potrebbe usare queste informazioni",
  "tags": ["tag1", "tag2", "tag3"]
}}"""

    claude = shutil.which("claude") or "claude"
    result = subprocess.run(
        [claude, "--print", "--output-format", "text"],
        input=prompt, capture_output=True, text=True, timeout=30,
    )
    try:
        raw = result.stdout.strip()
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0:
            return json.loads(raw[start:end])
    except Exception:
        pass
    return {}


# ── GitHub search ─────────────────────────────────────────────────────────────

def _search_github_templates() -> list[dict]:
    """Cerca template Remotion e HyperFrames su GitHub via web search."""
    queries = [
        "remotion template TikTok vertical video 9:16 site:github.com",
        "remotion composition viral shorts template 2025 site:github.com",
        "hyperframes template social video site:github.com",
        "react video template karaoke captions vertical site:github.com",
    ]
    found = []
    for q in queries:
        results = _search(q, max_results=3)
        for r in results:
            if "github.com" in r.get("url", "") and r not in found:
                found.append(r)
    return found[:8]


def _search_editing_techniques() -> list[dict]:
    """Cerca le tecniche di editing più virali del momento."""
    queries = [
        "TikTok video editing technique viral 2025 tutorial",
        "Instagram Reels hook first 3 seconds technique 2025",
        "vertical video editing trend motion graphics 2025",
        "karaoke caption style viral TikTok creator technique",
    ]
    found = []
    for q in queries:
        results = _search(q, max_results=3)
        found.extend(results)
    return found[:10]


# ── Core handlers ─────────────────────────────────────────────────────────────

def handle_user_message(text: str, url: str | None = None):
    """
    Risponde a un messaggio dell'utente nella CLACK Director chat.
    Se c'è una URL, la analizza. Altrimenti risponde con ricerca mirata.
    """
    if url:
        post_message(
            f"Sto analizzando: {url}",
            msg_type="system",
            tags=["analisi", "url"],
        )
        analysis = _analyze_url(url)
        if analysis:
            summary = analysis.get("summary", "")
            how = analysis.get("how_to_apply", "")
            techniques = analysis.get("techniques", [])
            tags = analysis.get("tags", [])

            msg_text = summary
            if how:
                msg_text += f"\n\n→ Come posso usarlo: {how}"
            if techniques:
                msg_text += "\n\nTecniche identificate:\n" + "\n".join(f"• {t}" for t in techniques)

            post_message(
                msg_text,
                msg_type="url_analysis",
                url=url,
                url_title=analysis.get("summary", url)[:80],
                tags=tags,
            )

            # Salva in memoria permanente
            if analysis.get("applicable_to_clack"):
                remember(f"url_{url[:80]}", {
                    "url": url,
                    "summary": summary,
                    "techniques": techniques,
                    "how_to_apply": how,
                    "tags": tags,
                    "user_note": text,
                })
                post_message(
                    "Ho salvato questa tecnica in memoria permanente. La userò nei prossimi render.",
                    msg_type="system",
                    tags=["memoria"],
                )
        else:
            post_message(
                f"Non sono riuscito ad analizzare la pagina. Prova con un link diretto a un articolo o repository.",
                msg_type="system",
            )
    else:
        # Ricerca mirata sul testo del messaggio
        results = _search(f"{text} video technique TikTok Reels", max_results=5)
        if results:
            best = results[0]
            post_message(
                f"Ho cercato '{text[:60]}' — trovato: {best.get('title', '')}\n\n{best.get('body', best.get('snippet', ''))}",
                msg_type="discovery",
                url=best.get("url"),
                url_title=best.get("title"),
                tags=["ricerca", "risposta"],
            )
            # Risorse correlate
            if len(results) > 1:
                links = "\n".join(f"• {r.get('title', r.get('url', ''))}" for r in results[1:4])
                post_message(
                    f"Altre risorse correlate:\n{links}",
                    msg_type="discovery",
                    tags=["correlati"],
                )
        else:
            post_message(
                f"Nessun risultato rilevante per '{text[:60]}'. Riprovo con una query diversa nella prossima sessione di ricerca.",
                msg_type="system",
            )


def run_autonomous_research():
    """
    Ricerca autonoma periodica — chiamata dal crontab o dal tasto 'Ricerca ora'.
    Cerca template, tecniche virali, aggiornamenti Remotion/HyperFrames.
    """
    post_message(
        "Avvio ricerca autonoma — template, tecniche virali, aggiornamenti...",
        msg_type="system",
        tags=["autonoma", "avvio"],
    )

    # ── 1. Template GitHub ──
    gh_results = _search_github_templates()
    if gh_results:
        new_templates = []
        mem = _load_mem()
        known_urls = {v.get("url") for v in mem.get("director_notes", {}).values()}

        for r in gh_results:
            if r.get("url") not in known_urls:
                new_templates.append(r)
                remember(f"template_{r['url'][:80]}", {
                    "url": r.get("url"),
                    "title": r.get("title"),
                    "snippet": r.get("body", "")[:200],
                    "source": "github_search",
                })

        if new_templates:
            titles = "\n".join(f"• {r.get('title', r.get('url', ''))}" for r in new_templates[:4])
            post_message(
                f"Ho trovato {len(new_templates)} nuovi template/repository interessanti:\n{titles}",
                msg_type="discovery",
                url=new_templates[0].get("url"),
                url_title=new_templates[0].get("title"),
                tags=["github", "template", "remotion"],
            )
        else:
            post_message(
                "Template GitHub: nessuna novità rispetto all'ultima ricerca.",
                msg_type="system",
                tags=["github"],
            )

    # ── 2. Tecniche virali ──
    technique_results = _search_editing_techniques()
    if technique_results:
        best = technique_results[0]
        snippet = best.get("body", best.get("snippet", ""))[:300]
        post_message(
            f"Tecnica virale in tendenza: {best.get('title', '')}\n\n{snippet}",
            msg_type="viral",
            url=best.get("url"),
            url_title=best.get("title"),
            tags=["tecnica", "trending", "editing"],
        )

    # ── 3. Aggiornamenti Remotion ──
    remotion_updates = _search("remotion new release changelog 2025 site:github.com", max_results=2)
    if remotion_updates:
        r = remotion_updates[0]
        post_message(
            f"Aggiornamento Remotion: {r.get('title', '')}\n{r.get('body', '')[:200]}",
            msg_type="discovery",
            url=r.get("url"),
            url_title=r.get("title"),
            tags=["remotion", "update"],
        )

    # ── 4. HyperFrames news ──
    hf_updates = _search("hyperframes video framework update 2025", max_results=2)
    if hf_updates:
        r = hf_updates[0]
        post_message(
            f"HyperFrames news: {r.get('title', '')}\n{r.get('body', '')[:200]}",
            msg_type="discovery",
            url=r.get("url"),
            url_title=r.get("title"),
            tags=["hyperframes", "update"],
        )

    post_message(
        f"Ricerca completata — memoria aggiornata con {len(_load_mem().get('director_notes', {}))} voci totali.",
        msg_type="system",
        tags=["completato"],
    )


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-message", type=str, default="")
    parser.add_argument("--url", type=str, default="")
    parser.add_argument("--research", action="store_true")
    args = parser.parse_args()

    if args.user_message:
        handle_user_message(args.user_message, url=args.url or None)
    elif args.research or not args.user_message:
        run_autonomous_research()


if __name__ == "__main__":
    main()
