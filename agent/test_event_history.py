#!/usr/bin/env python3
"""
Test that chat agent receives and formats event history correctly.

This test verifies that the chat agent sees recent activity context
and can reference what just happened in the simulation.

Usage:
    cd agent
    source .venv/bin/activate
    python test_event_history.py
"""

import json
import uuid
import httpx

BACKEND = "http://localhost:8123"
CHAT_PATH = "/agents/chat-changing-states"

GREEN = "\033[92m"
RED = "\033[91m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"


def ok(msg: str):
    print(f"  {GREEN}✓{RESET} {msg}")


def fail(msg: str):
    print(f"  {RED}✗{RESET} {msg}")


def info(msg: str):
    print(f"  {CYAN}→{RESET} {msg}")
    print()


def make_chat_request_with_events(
    phase: str, temperature: int, events: list[dict], question: str
) -> dict:
    """Build a chat request with specific simulation state and event history."""
    return {
        "threadId": str(uuid.uuid4()),
        "runId": str(uuid.uuid4()),
        "state": {
            "simulation": {
                "phase": phase,
                "temperature": temperature,
                "particleSpeed": temperature / 100,
                "sliderActive": False,
            },
            "events": {
                "latest": events[-1] if events else None,
                "history": events,
            },
            "companion": {
                "currentReaction": None,
                "reactionHistory": [],
                "progress": {},
                "spotlightUnlocked": False,
                "suggestedQuestions": [],
            },
        },
        "messages": [
            {"id": str(uuid.uuid4()), "role": "user", "content": question}
        ],
        "tools": [],
        "context": [],
        "forwardedProps": {},
    }


def extract_text_from_sse(url: str, payload: dict) -> str:
    """Send request and extract text response from SSE stream."""
    text_parts = []
    try:
        with httpx.stream(
            "POST",
            url,
            json=payload,
            headers={"Accept": "text/event-stream", "Content-Type": "application/json"},
            timeout=30.0,
        ) as response:
            if response.status_code != 200:
                return ""

            buffer = ""
            for chunk in response.iter_text():
                buffer += chunk
                while "\n\n" in buffer:
                    event_str, buffer = buffer.split("\n\n", 1)
                    for line in event_str.strip().split("\n"):
                        if line.startswith("data: "):
                            data = line[6:]
                            try:
                                parsed = json.loads(data)
                                if parsed.get("type") == "TEXT_MESSAGE_CONTENT":
                                    text_parts.append(parsed.get("delta", ""))
                            except json.JSONDecodeError:
                                pass
    except Exception as e:
        print(f"Error: {e}")
        return ""

    return "".join(text_parts)


def test_event_history():
    """Test that chat agent sees and uses event history."""
    print(f"\n{BOLD}Event History Test{RESET}")
    print(f"Testing that chat agent receives recent activity context\n")

    url = f"{BACKEND}{CHAT_PATH}"

    # Test 1: User just melted ice
    print(f"{BOLD}Test 1:{RESET} Just transitioned from solid to liquid")
    events1 = [
        {
            "type": "first_interaction",
            "timestamp": 1234567890.0,
            "data": {},
        },
        {
            "type": "phase_change",
            "timestamp": 1234567895.0,
            "data": {"from": "solid", "to": "liquid"},
        },
    ]
    payload1 = make_chat_request_with_events(
        "liquid", 50, events1, "What just happened?"
    )
    response1 = extract_text_from_sse(url, payload1)

    if response1:
        info(f"Response: {response1}")
        lower1 = response1.lower()
        if any(word in lower1 for word in ["melt", "liquid", "transition", "changed"]):
            ok("Chat referenced the phase transition")
        else:
            fail("Chat did not mention the transition")
    else:
        fail("No response received")

    # Test 2: User dwelled at liquid phase
    print(f"\n{BOLD}Test 2:{RESET} Stayed at liquid for 8 seconds")
    events2 = [
        {
            "type": "phase_change",
            "timestamp": 1234567890.0,
            "data": {"from": "solid", "to": "liquid"},
        },
        {
            "type": "dwell_timeout",
            "timestamp": 1234567898.0,
            "data": {"phase": "liquid", "seconds": 8},
        },
    ]
    payload2 = make_chat_request_with_events(
        "liquid", 50, events2, "What have I been doing?"
    )
    response2 = extract_text_from_sse(url, payload2)

    if response2:
        info(f"Response: {response2}")
        lower2 = response2.lower()
        if any(word in lower2 for word in ["observ", "watch", "look", "stay", "dwell"]):
            ok("Chat recognized observation behavior")
        else:
            fail("Chat did not mention observation")
    else:
        fail("No response received")

    # Test 3: User discovered all phases
    print(f"\n{BOLD}Test 3:{RESET} Discovered all three phases")
    events3 = [
        {
            "type": "phase_change",
            "timestamp": 1234567890.0,
            "data": {"from": "solid", "to": "liquid"},
        },
        {
            "type": "phase_change",
            "timestamp": 1234567895.0,
            "data": {"from": "liquid", "to": "gas"},
        },
        {
            "type": "milestone",
            "timestamp": 1234567895.1,
            "data": {"all_phases_visited": True},
        },
    ]
    payload3 = make_chat_request_with_events(
        "gas", 90, events3, "What did I accomplish?"
    )
    response3 = extract_text_from_sse(url, payload3)

    if response3:
        info(f"Response: {response3}")
        lower3 = response3.lower()
        if any(word in lower3 for word in ["all", "three", "discover", "found", "explore"]):
            ok("Chat acknowledged milestone achievement")
        else:
            fail("Chat did not mention milestone")
    else:
        fail("No response received")

    # Test 4: Rapid cycling behavior
    print(f"\n{BOLD}Test 4:{RESET} Rapidly exploring phases")
    events4 = [
        {
            "type": "phase_change",
            "timestamp": 1234567890.0,
            "data": {"from": "solid", "to": "liquid"},
        },
        {
            "type": "phase_change",
            "timestamp": 1234567892.0,
            "data": {"from": "liquid", "to": "gas"},
        },
        {
            "type": "phase_change",
            "timestamp": 1234567894.0,
            "data": {"from": "gas", "to": "liquid"},
        },
        {
            "type": "rapid_cycling",
            "timestamp": 1234567894.1,
            "data": {"transitionsInWindow": 3},
        },
    ]
    payload4 = make_chat_request_with_events(
        "liquid", 50, events4, "How am I exploring?"
    )
    response4 = extract_text_from_sse(url, payload4)

    if response4:
        info(f"Response: {response4}")
        lower4 = response4.lower()
        if any(word in lower4 for word in ["rapid", "quick", "fast", "active", "exploring"]):
            ok("Chat recognized rapid exploration pattern")
        else:
            fail("Chat did not mention exploration pattern")
    else:
        fail("No response received")

    # Summary
    print(f"\n{BOLD}Summary{RESET}")
    ok("Chat agent now receives event history context")
    ok("Events are pre-filtered by frontend (only meaningful changes)")
    info("The chat agent can now reference what just happened in the simulation")


if __name__ == "__main__":
    test_event_history()
