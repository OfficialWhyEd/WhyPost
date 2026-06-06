# agents/clack_research.py
# CLACK Research — studia i top creator, trova template virali, aggiorna la memoria editoriale.
# Bibbia: karaoke non negoziabile. Ogni video deve essere indistinguibile da un creator 1M+.

import json
import logging
import subprocess
import sys
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    print("Missing dep: requests. Run: pip install requests")
    sys.exit(1)

BASE = Path(__file__).parent.parent
MEMORY_PATH = BASE / "data" / "clack_memory.json"
TEMPLATES_DIR = BASE / "remotion" / "src" / "templates"

logger = logging.getLogger(__name__)

# ─── Memory ───────────────────────────────────────────────────────────────────

def load_memory() -> dict:
    try:
        return json.loads(MEMORY_PATH.read_text())
    except Exception:
        return {
            "templates": [],
            "viral_patterns": [],
            "editorial_rules": [],
            "what_worked": [],
            "last_research": None,
        }

def save_memory(mem: dict):
    MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    mem["updated_at"] = datetime.now().isoformat()
    MEMORY_PATH.write_text(json.dumps(mem, indent=2, ensure_ascii=False))
    logger.info(f"[RESEARCH] Memoria salvata → {MEMORY_PATH}")


# ─── GitHub template search ────────────────────────────────────────────────────

GITHUB_QUERIES = [
    "remotion tiktok template",
    "remotion reels viral",
    "remotion shorts captions",
    "remotion animated captions",
    "remotion social media portrait",
    "remotion karaoke text",
    "remotion word reveal",
]

def search_github_templates() -> list:
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "CLACK-Research/1.0",
    }
    found = []
    seen = set()

    for query in GITHUB_QUERIES:
        try:
            url = (
                "https://api.github.com/search/repositories"
                f"?q={query.replace(' ', '+')}&sort=stars&order=desc&per_page=8"
            )
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            for repo in resp.json().get("items", []):
                fn = repo["full_name"]
                if fn in seen or repo["stargazers_count"] < 3:
                    continue
                seen.add(fn)
                found.append({
                    "name": repo["name"],
                    "full_name": fn,
                    "url": repo["html_url"],
                    "clone_url": repo["clone_url"],
                    "stars": repo["stargazers_count"],
                    "description": repo.get("description", ""),
                    "topics": repo.get("topics", []),
                    "found_at": datetime.now().isoformat(),
                    "clack_verdict": "",
                    "clack_score": 0,
                })
        except Exception as e:
            logger.warning(f"[RESEARCH] GitHub query '{query}': {e}")

    return sorted(found, key=lambda r: r["stars"], reverse=True)[:30]


# ─── yt-dlp viral analysis ─────────────────────────────────────────────────────

def fetch_video_meta(url: str) -> dict | None:
    try:
        result = subprocess.run(
            ["yt-dlp", "--dump-json", "--no-download", "--no-warnings",
             "--extractor-args", "tiktok:api_hostname=api22-normal-c-useast2a.tiktokv.com",
             url],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            raw = result.stdout.strip().splitlines()[0]
            meta = json.loads(raw)
            return {
                "title": meta.get("title", "")[:200],
                "duration": meta.get("duration", 0),
                "view_count": meta.get("view_count", 0),
                "like_count": meta.get("like_count", 0),
                "comment_count": meta.get("comment_count", 0),
                "description": meta.get("description", "")[:400],
                "tags": meta.get("tags", [])[:15],
                "uploader": meta.get("uploader", ""),
                "platform": meta.get("extractor", "unknown"),
                "url": url,
                "analyzed_at": datetime.now().isoformat(),
            }
    except Exception as e:
        logger.warning(f"[RESEARCH] yt-dlp ({url}): {e}")
    return None

def add_viral_video(url: str) -> bool:
    mem = load_memory()
    existing_urls = {p["url"] for p in mem.get("viral_patterns", [])}
    if url in existing_urls:
        logger.info(f"[RESEARCH] già in memoria: {url}")
        return False

    meta = fetch_video_meta(url)
    if not meta:
        return False

    mem.setdefault("viral_patterns", []).append(meta)
    logger.info(f"[RESEARCH] +1 video virale: {meta['uploader']} — {meta['view_count']:,} views")

    # Rigenera regole editoriali dopo ogni aggiunta
    rules = derive_editorial_rules(mem["viral_patterns"])
    if rules:
        mem["editorial_rules"] = rules

    save_memory(mem)
    return True


# ─── Claude analysis ────────────────────────────────────────────────────────────

def ask_claude(prompt: str) -> str:
    try:
        result = subprocess.run(
            ["claude", "-p", prompt],
            capture_output=True, text=True, timeout=90
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception as e:
        logger.warning(f"[RESEARCH] Claude: {e}")
        return ""

def _extract_json_array(text: str) -> list:
    start = text.find("[")
    end = text.rfind("]") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass
    return []

def score_templates(templates: list) -> list:
    if not templates:
        return templates
    top = templates[:8]
    summary = "\n".join(
        f"- {t['full_name']} ({t['stars']}⭐): {t['description']}"
        for t in top
    )
    response = ask_claude(
        "Sei CLACK, un editor video AI che crea contenuti virali per TikTok e Instagram Reels. "
        "Analizza questi template Remotion trovati su GitHub e valutali per uso virale in formato portrait 9:16.\n\n"
        f"{summary}\n\n"
        "Per ognuno rispondi in JSON con questo schema esatto:\n"
        '[{"full_name": "...", "score": 0-10, "karaoke_ready": true/false, '
        '"verdict": "una riga perché è utile o no"}]\n'
        "Dai punteggio alto a: karaoke/word-reveal, motion graphics esplosive, caption animate, stile TikTok."
    )
    scored = _extract_json_array(response)
    score_map = {s["full_name"]: s for s in scored if "full_name" in s}
    for t in templates:
        if t["full_name"] in score_map:
            t["clack_score"] = score_map[t["full_name"]].get("score", 0)
            t["clack_verdict"] = score_map[t["full_name"]].get("verdict", "")
            t["karaoke_ready"] = score_map[t["full_name"]].get("karaoke_ready", False)
    return templates

def derive_editorial_rules(viral_patterns: list) -> list:
    if len(viral_patterns) < 2:
        return []
    sample = viral_patterns[:15]
    summary = json.dumps(sample, ensure_ascii=False)
    response = ask_claude(
        "Sei CLACK. Analizza questi metadata di video virali TikTok/Instagram Reels.\n\n"
        f"{summary}\n\n"
        "Deriva 6-10 regole editoriali concrete per creare video virali simili. "
        "Focus su: durata ottimale, struttura hook/body/cta in secondi, "
        "stile caption (dimensione, velocità, colore), ritmo tagli, energia visiva, "
        "primi 2 secondi (hook), finale (CTA).\n"
        "Rispondi in JSON:\n"
        '[{"rule": "...", "why": "...", "apply_to": "hook|body|cta|caption|general"}]'
    )
    rules = _extract_json_array(response)
    logger.info(f"[RESEARCH] {len(rules)} regole editoriali derivate")
    return rules


# ─── Main research pipeline ────────────────────────────────────────────────────

def run_research(force: bool = False):
    mem = load_memory()

    # Throttle: non ricercare più di una volta ogni 24h
    last = mem.get("last_research")
    if last and not force:
        try:
            from datetime import datetime as _dt, timedelta
            elapsed = _dt.now() - _dt.fromisoformat(last)
            if elapsed.total_seconds() < 86400:
                logger.info(f"[RESEARCH] Ultimo aggiornamento {elapsed.seconds//3600}h fa — skip (usa --force per forzare)")
                return
        except Exception:
            pass

    logger.info("[RESEARCH] ═══ CLACK Research avviato ═══")

    # 1. GitHub templates
    logger.info("[RESEARCH] Cerca template GitHub...")
    templates = search_github_templates()
    if templates:
        logger.info(f"[RESEARCH] {len(templates)} template trovati")
        templates = score_templates(templates)
        # Merge con quelli esistenti
        existing_fns = {t["full_name"] for t in mem.get("templates", [])}
        for t in templates:
            if t["full_name"] not in existing_fns:
                mem.setdefault("templates", []).append(t)
            else:
                # Aggiorna scores
                for et in mem["templates"]:
                    if et["full_name"] == t["full_name"]:
                        et.update({k: t[k] for k in ["clack_score", "clack_verdict", "karaoke_ready"]})
        # Riordina per score
        mem["templates"] = sorted(
            mem.get("templates", []),
            key=lambda t: t.get("clack_score", 0),
            reverse=True
        )
        top3 = [f"{t['full_name']} ({t.get('clack_score', 0)}/10)" for t in mem["templates"][:3]]
        logger.info(f"[RESEARCH] Top template: {', '.join(top3)}")

    # 2. Web search: nuovi template e tecniche editing
    logger.info("[RESEARCH] Web search per nuove tecniche e template...")
    try:
        from agents.web_search import get_clack_updates
        web_updates = get_clack_updates()
        new_web_templates = web_updates.get("new_templates", [])
        new_techniques = web_updates.get("new_techniques", [])
        if new_techniques:
            mem.setdefault("editing_techniques", [])
            existing_urls = {t.get("url") for t in mem["editing_techniques"]}
            added = [t for t in new_techniques if t["url"] not in existing_urls]
            mem["editing_techniques"].extend(added)
            logger.info(f"[RESEARCH] +{len(added)} nuove tecniche editing trovate")
        if new_web_templates:
            existing_fns = {t.get("url") for t in mem.get("web_found_templates", [])}
            added_wt = [t for t in new_web_templates if t["url"] not in existing_fns]
            mem.setdefault("web_found_templates", []).extend(added_wt)
    except Exception as e:
        logger.warning(f"[RESEARCH] web_search skip: {e}")

    # 3. Regole editoriali da pattern virali esistenti
    if mem.get("viral_patterns"):
        logger.info(f"[RESEARCH] Analizza {len(mem['viral_patterns'])} video virali...")
        rules = derive_editorial_rules(mem["viral_patterns"])
        if rules:
            mem["editorial_rules"] = rules

    mem["last_research"] = datetime.now().isoformat()
    save_memory(mem)
    logger.info("[RESEARCH] ═══ Research completato ═══")

def get_best_template() -> dict | None:
    mem = load_memory()
    templates = [t for t in mem.get("templates", []) if t.get("clack_score", 0) >= 7]
    return templates[0] if templates else None

def get_editorial_rules() -> list:
    return load_memory().get("editorial_rules", [])

def record_video_result(vid_id: str, published: bool, views: int = 0, notes: str = ""):
    mem = load_memory()
    mem.setdefault("what_worked", []).append({
        "vid_id": vid_id,
        "published": published,
        "views": views,
        "notes": notes,
        "recorded_at": datetime.now().isoformat(),
    })
    save_memory(mem)


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [RESEARCH] %(message)s")
    parser = argparse.ArgumentParser(description="CLACK Research")
    parser.add_argument("--force", action="store_true", help="Forza ricerca anche se recente")
    parser.add_argument("--add-video", metavar="URL", help="Aggiunge un video virale alla memoria")
    args = parser.parse_args()

    if args.add_video:
        ok = add_viral_video(args.add_video)
        print("OK" if ok else "FAIL")
    else:
        run_research(force=args.force)
