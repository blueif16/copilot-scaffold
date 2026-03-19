# Student Dashboard example — backend tool definitions.
from langchain_core.tools import tool


@tool
def show_user_card(username: str, age: int) -> dict:
    """Display the student's profile card with name and age."""
    return {
        "widget": "user_card",
        "action": "spawn",
        "props": {"username": username, "age": age},
    }


@tool
def show_topic_progress(topics: list[dict]) -> dict:
    """Display progress bars for all science topics."""
    return {
        "widget": "topic_progress",
        "action": "spawn",
        "props": {"topics": topics},
    }


all_tools = [show_user_card, show_topic_progress]
