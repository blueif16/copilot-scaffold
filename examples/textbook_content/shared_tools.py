"""Shared domain tools for quiz/page-type widgets.

Generic navigation tools any interactive widget might need.
"""
from langchain_core.tools import tool


@tool
def set_page(index: int) -> dict:
    """Jump to a specific page/question by index.

    Args:
        index: Zero-based index to navigate to.
    """
    return {"currentIndex": index, "phase": "in_progress"}


@tool
def go_to_review() -> dict:
    """Show the results/review screen."""
    return {"phase": "review"}


@tool
def restart() -> dict:
    """Reset everything — start over from the beginning."""
    return {
        "currentIndex": 0,
        "answers": {},
        "results": {},
        "score": 0,
        "phase": "in_progress",
    }


quiz_domain_tools = [set_page, go_to_review, restart]
