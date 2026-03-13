"""Agent tools for LangGraph."""
from langchain_core.tools import tool


@tool
def calculate(expression: str) -> str:
    """
    Evaluate a mathematical expression.

    Args:
        expression: A mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")

    Returns:
        The result of the calculation as a string
    """
    try:
        # Safe evaluation of basic math expressions
        result = eval(expression, {"__builtins__": {}}, {})
        return str(result)
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def get_info(topic: str) -> str:
    """
    Get information about a topic.

    Args:
        topic: The topic to get information about

    Returns:
        Information about the requested topic
    """
    # Simple mock implementation
    info_db = {
        "weather": "The weather is sunny and 72°F",
        "time": "The current time is 3:00 PM",
        "default": f"Information about {topic} is not available"
    }
    return info_db.get(topic.lower(), info_db["default"])
