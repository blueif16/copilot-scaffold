# Student Dashboard example — backend tool definitions.
# Each widget from the frontend has a corresponding Python tool here.
# Tools return widget spawn instructions for the frontend to render.
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
    """Display progress bars for all science topics.

    Args:
        topics: Array of { name: str, progress: float (0-1), status: str }
    """
    return {
        "widget": "topic_progress",
        "action": "spawn",
        "props": {"topics": topics},
    }


# All tools from this example
all_tools = [show_user_card, show_topic_progress]
