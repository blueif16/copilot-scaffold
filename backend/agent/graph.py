"""LangGraph agent implementation with Gemini LLM for Science Labs."""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import MemorySaver
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from .state import LabState
from .tools import all_tools


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


# System prompt for the science lab guide
SYSTEM_PROMPT = """You are a science lab guide for curious learners.

You have access to these UI tools. Call them to change what the student sees:
- show_lab_selector()            → shows the three-lab navigation card
- show_ice_cream_maker()         → states-of-matter: ice cream phase-change simulation
- show_particle_simulation()     → states-of-matter: pushes and pulls particle sandbox
- show_wheel_axle_workshop()    → wheel & axle: mesopotamian innovation explorer
- show_vehicle_designer()       → wheel & axle: build-a-vehicle sandbox
- show_camera_obscura()          → light & shadows: camera obscura interactive
- show_shadow_ar_module()        → light & shadows: shadow angle / time-of-day simulator
- request_student_approval(...)  → HITL: pause and ask student to confirm before proceeding

Rules:
- Always start with show_lab_selector() on the first message.
- When a student expresses interest in a topic, proactively call the matching UI tool.
- Narrate WHILE the component is loading — the text streams alongside the widget.
- Use request_student_approval() before advancing to a new lab section.
"""


# Bind tools to LLM
llm = get_llm()
llm_with_tools = llm.bind_tools(all_tools)


def agent_node(state: LabState) -> dict:
    """
    Main agent node that processes the current state using Gemini LLM.

    Args:
        state: Current agent state

    Returns:
        Updated state dictionary
    """
    messages = state.get("messages", [])

    # Build the message list for the LLM
    llm_messages = [SystemMessage(content=SYSTEM_PROMPT)]

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

    # Invoke the LLM with tools
    response = llm_with_tools.invoke(llm_messages)

    # Check if tools were called
    tool_calls = []
    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_calls = response.tool_calls

    # Determine active_lab based on tool calls
    active_lab = None
    if tool_calls:
        tool_name = tool_calls[0].get("name", "")
        if tool_name in ["show_ice_cream_maker", "show_particle_simulation"]:
            active_lab = "states_of_matter"
        elif tool_name in ["show_wheel_axle_workshop", "show_vehicle_designer"]:
            active_lab = "wheel_axle"
        elif tool_name in ["show_camera_obscura", "show_shadow_ar_module"]:
            active_lab = "light_shadows"

    return {
        "messages": [*messages, response] if messages else [response],
        "active_lab": active_lab,
        "tool_calls": tool_calls,
    }


def approval_node(state: LabState) -> Command:
    """Pause execution and surface an approval card in the UI."""
    pending = state.get("pending_approval", {})
    message = pending.get("message", "Ready to continue?")
    next_module = pending.get("next_module", "")

    # Use interrupt to pause and wait for human approval
    decision = interrupt({
        "type": "lab_advance_approval",
        "message": message,
        "next_module": next_module,
    })

    if decision is True:
        return Command(goto="agent")
    return Command(goto=END)


def route_after_agent(state: LabState):
    """Route to tools, approval, or end based on agent output."""
    messages = state.get("messages", [])
    if not messages:
        return END

    last = messages[-1]

    # Check for tool calls
    tool_calls = getattr(last, "tool_calls", None)
    if tool_calls:
        for tc in tool_calls:
            if tc.get("name") == "request_student_approval":
                return "approval"
        return "tools"
    return END


def create_graph():
    """
    Create and compile the LangGraph StateGraph.

    Returns:
        Compiled graph ready for execution
    """
    # Create the graph with our state schema
    workflow = StateGraph(LabState)

    # Add the agent node
    workflow.add_node("agent", agent_node)

    # Add tool node with our tools
    tool_node = ToolNode(all_tools)
    workflow.add_node("tools", tool_node)

    # Add approval node for HITL
    workflow.add_node("approval", approval_node)

    # Define the workflow
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges("agent", route_after_agent)
    workflow.add_edge("tools", "agent")
    workflow.add_edge("approval", "agent")

    # Compile with memory checkpoint
    return workflow.compile(checkpointer=MemorySaver())


# Create the graph instance
graph = create_graph()
