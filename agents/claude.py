import subprocess
import time
import logging

logger = logging.getLogger(__name__)
BACKOFF = [30, 60, 300, 900]

def ask_claude(prompt: str, model: str = "sonnet") -> str:
    for attempt, wait in enumerate([0] + BACKOFF):
        if wait:
            logger.warning(f"Rate limit, waiting {wait}s (attempt {attempt})")
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
            logger.error("Claude timed out")
            return ""
    return ""
