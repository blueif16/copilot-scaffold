"""Agent tools registry. Add your app-specific tools here."""
from langchain_core.tools import tool


@tool
def get_current_time() -> str:
    """Get the current server time."""
    from datetime import datetime
    return datetime.now().isoformat()


# Tool registry — add your app tools to this list
all_tools = [get_current_time]
