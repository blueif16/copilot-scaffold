"""LangGraph agent implementation with Gemini LLM."""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from .state import AgentState
from .tools import calculate, get_info


# Initialize Gemini LLM
def get_llm():
    """Get the Gemini LLM instance."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable is not set")

    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0.7,
        google_api_key=api_key,
    )


# Bind tools to LLM
llm = get_llm()
llm_with_tools = llm.bind_tools([calculate, get_info])


def agent_node(state: AgentState) -> dict:
    """
    Main agent node that processes the current state using Gemini LLM.

    Args:
        state: Current agent state

    Returns:
        Updated state dictionary
    """
    messages = state.get("messages", [])
    current_task = state.get("current_task", "")

    # Build the message list for the LLM
    llm_messages = []

    # Add system message
    llm_messages.append(SystemMessage(content="You are a helpful assistant that can answer questions and use tools when needed."))

    # Add existing messages
    for msg in messages:
        if isinstance(msg, dict):
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                llm_messages.append(HumanMessage(content=content))
            else:
                llm_messages.append({"role": "assistant", "content": content})
        else:
            llm_messages.append(msg)

    # Add current task if present
    if current_task:
        llm_messages.append(HumanMessage(content=current_task))

    # Invoke the LLM with tools
    response = llm_with_tools.invoke(llm_messages)

    # Check if tools were called
    tool_calls = []
    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_calls = response.tool_calls

    return {
        "result": response.content if hasattr(response, "content") else str(response),
        "messages": [*messages, response] if messages else [response],
        "tool_calls": tool_calls,
    }


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
