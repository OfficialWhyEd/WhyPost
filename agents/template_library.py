# agents/template_library.py
# Libreria di template Remotion. CLACK non ricomincia mai da zero.
# Scarica da GitHub, valuta con Claude, traccia performance, auto-seleziona.
# Repo principale: reactvideoeditor/remotion-templates (81+ template TikTok/Reels)

import json
import logging
import subprocess
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

BASE = Path(__file__).parent.parent
TEMPLATES_DIR = BASE / "data" / "templates"
REMOTION_TEMPLATES_DIR = BASE / "remotion" / "src" / "templates"
LIBRARY_PATH = BASE / "data" / "template_library.json"

logger = logging.getLogger(__name__)

# ─── Template sources ────────────────────────────────────────────────────────

TEMPLATE_SOURCES = [
    {
        "repo": "reactvideoeditor/remotion-templates",
        "description": "81+ template Remotion gratuiti TikTok/Reels/Shorts",
        "priority": 10,
        "tags": ["tiktok", "reels", "shorts", "portrait"],
    },
    {
        "repo": "remotion-dev/remotion",
        "description": "Repo ufficiale Remotion con esempi e starter",
        "priority": 8,
        "tags": ["official", "starter"],
    },
    {
        "repo": "FelippeChemello/Remotion-Templates",
        "description": "Template Remotion social media",
        "priority": 7,
        "tags": ["social", "animated"],
    },
]

# Topic → stile template preferito
TOPIC_STYLE_MAP = {
    "apple": {"style": "minimal_dark", "colors": ["#1d1d1f", "#f5f5f7"], "energy": "calm"},
    "ai": {"style": "tech_dark", "colors": ["#070709", "#00ff88"], "energy": "high"},
    "tech": {"style": "tech_dark", "colors": ["#070709", "#4ade80"], "energy": "medium"},
    "gaming": {"style": "neon", "colors": ["#0a0a1a", "#ff00ff"], "energy": "high"},
    "science": {"style": "minimal", "colors": ["#0f172a", "#60a5fa"], "energy": "medium"},
    "money": {"style": "premium", "colors": ["#0a0a0a", "#ffd700"], "energy": "high"},
    "health": {"style": "clean", "colors": ["#f0fdf4", "#16a34a"], "energy": "calm"},
    "news": {"style": "breaking", "colors": ["#0c0c0c", "#ef4444"], "energy": "high"},
}


# ─── Library I/O ─────────────────────────────────────────────────────────────

def load_library() -> dict:
    try:
        return json.loads(LIBRARY_PATH.read_text())
    except Exception:
        return {
            "templates": [],
            "performance": {},
            "last_sync": None,
            "installed": [],
        }

def save_library(lib: dict):
    LIBRARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    lib["updated_at"] = datetime.now().isoformat()
    LIBRARY_PATH.write_text(json.dumps(lib, indent=2, ensure_ascii=False))


# ─── GitHub discovery ────────────────────────────────────────────────────────

def fetch_repo_contents(repo: str, path: str = "") -> list:
    """Lista file/cartelle in un repo GitHub."""
    if not requests:
        return []
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    try:
        resp = requests.get(url, headers={"User-Agent": "CLACK-Template-Library"}, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"[LIB] GitHub contents {repo}/{path}: {e}")
        return []

def discover_templates_in_repo(source: dict) -> list:
    """Scansiona un repo GitHub per trovare template Remotion (cercando Root.tsx o Composition)."""
    repo = source["repo"]
    found = []

    contents = fetch_repo_contents(repo)
    for item in contents:
        if item.get("type") == "dir":
            sub = fetch_repo_contents(repo, item["name"])
            for f in sub:
                name = f.get("name", "")
                if name in ("Root.tsx", "Composition.tsx", "index.tsx") or name.endswith(".tsx"):
                    found.append({
                        "id": f"{repo}/{item['name']}",
                        "name": item["name"],
                        "repo": repo,
                        "path": f"{item['name']}/{name}",
                        "download_url": f"https://raw.githubusercontent.com/{repo}/main/{item['name']}/",
                        "source_priority": source["priority"],
                        "tags": source.get("tags", []),
                        "clack_score": 0,
                        "uses": 0,
                        "last_render_score": None,
                        "discovered_at": datetime.now().isoformat(),
                    })
                    break  # un entry per cartella

    logger.info(f"[LIB] {repo}: {len(found)} template trovati")
    return found

def sync_from_github(force: bool = False) -> int:
    lib = load_library()

    # Throttle 6h
    if lib.get("last_sync") and not force:
        try:
            elapsed = (datetime.now() - datetime.fromisoformat(lib["last_sync"])).total_seconds()
            if elapsed < 21600:
                logger.info(f"[LIB] Sync recente ({elapsed/3600:.1f}h fa) — skip")
                return 0
        except Exception:
            pass

    all_found = []
    existing_ids = {t["id"] for t in lib.get("templates", [])}

    for source in TEMPLATE_SOURCES:
        found = discover_templates_in_repo(source)
        for t in found:
            if t["id"] not in existing_ids:
                all_found.append(t)
                existing_ids.add(t["id"])

    if all_found:
        lib.setdefault("templates", []).extend(all_found)
        # Score con Claude i nuovi template
        lib["templates"] = score_templates_claude(lib["templates"])
        lib["templates"].sort(key=lambda t: t.get("clack_score", 0), reverse=True)

    lib["last_sync"] = datetime.now().isoformat()
    save_library(lib)
    logger.info(f"[LIB] +{len(all_found)} nuovi template. Totale: {len(lib['templates'])}")
    return len(all_found)

def score_templates_claude(templates: list) -> list:
    """Usa Claude per valutare i template e assegnare clack_score 0-10."""
    unscored = [t for t in templates if t.get("clack_score", 0) == 0]
    if not unscored:
        return templates

    batch = unscored[:10]
    summary = "\n".join(
        f"- id={t['id']} name={t['name']} repo={t['repo']} tags={t['tags']}"
        for t in batch
    )
    try:
        result = subprocess.run(
            ["claude", "-p",
             "Sei CLACK, editor video AI per TikTok/IG Reels. "
             "Valuta questi template Remotion per contenuti virali portrait 9:16.\n\n"
             f"{summary}\n\n"
             "Score 0-10: karaoke_ready, visual_impact, tiktok_fit, reusability.\n"
             "Rispondi JSON: [{\"id\": \"...\", \"score\": 7, \"verdict\": \"...\", \"best_for\": \"...\"}]"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            text = result.stdout.strip()
            start = text.find("[")
            end = text.rfind("]") + 1
            if start >= 0:
                scored = json.loads(text[start:end])
                score_map = {s["id"]: s for s in scored}
                for t in templates:
                    if t["id"] in score_map:
                        t["clack_score"] = score_map[t["id"]].get("score", 0)
                        t["clack_verdict"] = score_map[t["id"]].get("verdict", "")
                        t["best_for"] = score_map[t["id"]].get("best_for", "")
    except Exception as e:
        logger.warning(f"[LIB] Score error: {e}")

    return templates


# ─── Template selection ───────────────────────────────────────────────────────

def select_template(topic: str = "", video_type: str = "tech_news") -> dict:
    """
    Seleziona il template migliore per un topic/tipo video.
    Considera: clack_score, performance storica, match con topic style.
    Restituisce il template dict o {} se nessuno disponibile.
    """
    lib = load_library()
    templates = lib.get("templates", [])
    perf = lib.get("performance", {})

    if not templates:
        return {}

    # Trova stile per il topic
    topic_lower = topic.lower()
    matched_style = None
    for key, style in TOPIC_STYLE_MAP.items():
        if key in topic_lower:
            matched_style = style
            break

    def template_score(t: dict) -> float:
        base = t.get("clack_score", 0)
        # Bonus per performance storica positiva
        tid = t["id"]
        if tid in perf:
            p = perf[tid]
            avg_views = p.get("avg_views", 0)
            renders = p.get("renders", 0)
            if renders > 0:
                base += min(3.0, avg_views / 10000)  # max +3 per video molto visti
        # Penalità se usato di recente (varietà)
        last_used = t.get("last_used_at")
        if last_used:
            try:
                hours_ago = (datetime.now() - datetime.fromisoformat(last_used)).total_seconds() / 3600
                if hours_ago < 24:
                    base -= 1.5
            except Exception:
                pass
        return base

    sorted_templates = sorted(templates, key=template_score, reverse=True)
    best = sorted_templates[0] if sorted_templates else {}
    logger.info(
        f"[LIB] Template selezionato per '{topic}': "
        f"{best.get('name', 'none')} (score {best.get('clack_score', 0)})"
    )
    return best


def record_render(template_id: str, views: int = 0, success: bool = True):
    """Registra il risultato di un render per alimentare la performance storica."""
    lib = load_library()
    perf = lib.setdefault("performance", {})
    entry = perf.setdefault(template_id, {"renders": 0, "successes": 0, "total_views": 0, "avg_views": 0})
    entry["renders"] += 1
    if success:
        entry["successes"] += 1
    entry["total_views"] += views
    entry["avg_views"] = entry["total_views"] / max(entry["renders"], 1)
    entry["last_render"] = datetime.now().isoformat()

    # Aggiorna last_used_at nel template
    for t in lib.get("templates", []):
        if t["id"] == template_id:
            t["last_used_at"] = datetime.now().isoformat()
            t["uses"] = t.get("uses", 0) + 1

    save_library(lib)


def prune_bad_templates(min_score: int = 3):
    """Elimina template con score basso e poche performance positive."""
    lib = load_library()
    perf = lib.get("performance", {})
    before = len(lib.get("templates", []))

    def keep(t: dict) -> bool:
        if t.get("clack_score", 0) >= min_score:
            return True
        tid = t["id"]
        if tid in perf and perf[tid].get("avg_views", 0) > 5000:
            return True  # funziona nonostante score basso
        return False

    lib["templates"] = [t for t in lib.get("templates", []) if keep(t)]
    removed = before - len(lib["templates"])
    if removed:
        logger.info(f"[LIB] Pruned {removed} template scarsi")
    save_library(lib)
    return removed


def get_top_templates(n: int = 5) -> list:
    lib = load_library()
    return sorted(lib.get("templates", []), key=lambda t: t.get("clack_score", 0), reverse=True)[:n]


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [LIBRARY] %(message)s")

    parser = argparse.ArgumentParser(description="CLACK Template Library")
    parser.add_argument("--sync", action="store_true", help="Sincronizza da GitHub")
    parser.add_argument("--force", action="store_true", help="Forza sync anche se recente")
    parser.add_argument("--top", action="store_true", help="Mostra top template")
    parser.add_argument("--prune", action="store_true", help="Rimuovi template scarsi")
    parser.add_argument("--select", metavar="TOPIC", help="Seleziona miglior template per topic")
    args = parser.parse_args()

    if args.sync:
        n = sync_from_github(force=args.force)
        print(f"+{n} nuovi template")
    elif args.top:
        for t in get_top_templates():
            print(f"{t['clack_score']:4.1f}  {t['name']:30s}  {t.get('clack_verdict', '')}")
    elif args.prune:
        removed = prune_bad_templates()
        print(f"Rimossi {removed} template")
    elif args.select:
        t = select_template(args.select)
        print(json.dumps(t, indent=2, ensure_ascii=False))
    else:
        lib = load_library()
        print(f"Template in libreria: {len(lib.get('templates', []))}")
        print(f"Ultimo sync: {lib.get('last_sync', 'mai')}")
