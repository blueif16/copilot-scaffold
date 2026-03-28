"""Textbook Content — widget collection.

This example is a CONTAINER for self-contained educational widgets.
Each widget under widgets/ has its own:
  - React component (unique rendering per widget)
  - config.py (SubagentConfig + spawn tool + baked-in data)
  - prompt.md (domain knowledge for the widget's companion agent)

This __init__.py auto-discovers SubagentConfigs from all widget dirs.
It has ZERO domain knowledge itself — everything lives in the widgets.

To add a new widget (e.g. after publish-transform from CourseBuilder):
  1. Create widgets/<widget_name>/ with all files
  2. Add barrel export to index.ts
  3. That's it — this file discovers the rest automatically
"""
import importlib
import logging
import os

logger = logging.getLogger(__name__)

# ── Auto-discover SUBAGENTS from widgets/*/config.py ─────

_widgets_dir = os.path.join(os.path.dirname(__file__), "widgets")
SUBAGENTS = []

for entry in sorted(os.listdir(_widgets_dir)):
    widget_dir = os.path.join(_widgets_dir, entry)
    config_file = os.path.join(widget_dir, "config.py")

    if not os.path.isdir(widget_dir):
        continue
    if not os.path.isfile(config_file):
        continue
    if entry.startswith("_") or entry.startswith("."):
        continue

    try:
        mod = importlib.import_module(
            f"examples.textbook_content.widgets.{entry}.config"
        )
        subagent = getattr(mod, "SUBAGENT", None)
        if subagent is not None:
            SUBAGENTS.append(subagent)
            logger.info(f"[textbook_content] registered widget '{subagent.id}' from {entry}/")
        else:
            logger.warning(f"[textbook_content] {entry}/config.py has no SUBAGENT export")
    except Exception as e:
        logger.warning(f"[textbook_content] failed to load {entry}/config.py: {e}")

logger.info(f"[textbook_content] total widgets: {[s.id for s in SUBAGENTS]}")
