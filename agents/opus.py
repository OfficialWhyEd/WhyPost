import logging
from pathlib import Path
from agents.claude import ask_claude

BASE = Path(__file__).parent.parent
logger = logging.getLogger(__name__)
PROMPT = (BASE / "prompts" / "weekly_review.md").read_text() if (BASE / "prompts" / "weekly_review.md").exists() else "Fai una review settimanale del content system WhyPost e suggerisci miglioramenti."

def run():
    logger.info("Running weekly Opus review...")
    response = ask_claude(PROMPT, model="opus")
    report_path = BASE / "data" / "weekly_report.md"
    report_path.write_text(f"# Weekly Review\n\n{response}")
    logger.info(f"Report saved to {report_path}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
