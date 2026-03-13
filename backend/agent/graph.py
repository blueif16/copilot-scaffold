"""LangGraph agent implementation."""
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from .state import AgentState
from .tools import calculate, get_info


def agent_node(state: AgentState) -> dict:
    """
    Main agent node that processes the current state.

    Args:
        state: Current agent state

    Returns:
        Updated state dictionary
    """
    messages = state.get("messages", [])
    current_task = state.get("current_task", "")

    # Simple processing logic
    if current_task:
        result = f"Processed task: {current_task}"
    elif messages:
        result = f"Processed {len(messages)} messages"
    else:
        result = "No task to process"

    return {"result": result}


def create_graph():
    """
    Create and compile the LangGraph StateGraph.

    Returns:
        Compiled graph ready for execution
    """
    # Create the graph with our state schema
    workflow = StateGraph(AgentState)

    # Add the agent node
    workflow.add_node("agent", agent_node)

    # Add tool node with our tools
    tools = [calculate, get_info]
    tool_node = ToolNode(tools)
    workflow.add_node("tools", tool_node)

    # Define the workflow
    workflow.add_edge(START, "agent")
    workflow.add_edge("agent", END)

    # Compile and return
    return workflow.compile()


# Create the graph instance
graph = create_graph()
