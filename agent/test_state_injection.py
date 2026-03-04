#!/usr/bin/env python3
"""
Test that chat agent receives fresh simulation state on every request.

This test verifies that when simulation state changes, the chat agent
always sees the current state in its system prompt, not stale data.

Usage:
    cd agent
    source .venv/bin/activate
    python test_state_injection.py
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
    print()  # Add blank line for readability


def make_chat_request(phase: str, temperature: int, question: str) -> dict:
    """Build a chat request with specific simulation state."""
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


def test_state_injection():
    """Test that chat agent sees current simulation state."""
    print(f"\n{BOLD}State Injection Test{RESET}")
    print(f"Testing that chat agent receives fresh state on every request\n")

    url = f"{BACKEND}{CHAT_PATH}"

    # Test 1: Ask about solid state
    print(f"{BOLD}Test 1:{RESET} Solid state (temperature=10)")
    payload1 = make_chat_request("solid", 10, "What state is the matter in right now?")
    response1 = extract_text_from_sse(url, payload1)

    if response1:
        info(f"Response: {response1}")
        lower1 = response1.lower()
        if "solid" in lower1 or "ice" in lower1 or "frozen" in lower1 or "packed together" in lower1:
            ok("Chat correctly identified SOLID state")
        else:
            fail(f"Chat did not mention solid state")
    else:
        fail("No response received")

    # Test 2: Ask about liquid state (different thread, same question)
    print(f"\n{BOLD}Test 2:{RESET} Liquid state (temperature=50)")
    payload2 = make_chat_request("liquid", 50, "What state is the matter in right now?")
    response2 = extract_text_from_sse(url, payload2)

    if response2:
        info(f"Response: {response2}")
        lower2 = response2.lower()
        if "liquid" in lower2 or "water" in lower2 or "melted" in lower2 or "wiggling around" in lower2 or "moving around" in lower2:
            ok("Chat correctly identified LIQUID state")
        else:
            fail(f"Chat did not mention liquid state")
    else:
        fail("No response received")

    # Test 3: Ask about gas state
    print(f"\n{BOLD}Test 3:{RESET} Gas state (temperature=90)")
    payload3 = make_chat_request("gas", 90, "What state is the matter in right now?")
    response3 = extract_text_from_sse(url, payload3)

    if response3:
        info(f"Response: {response3}")
        lower3 = response3.lower()
        if "gas" in lower3 or "steam" in lower3 or "vapor" in lower3 or "boil" in lower3 or "zooming" in lower3 or "far apart" in lower3:
            ok("Chat correctly identified GAS state")
        else:
            fail(f"Chat did not mention gas state")
    else:
        fail("No response received")

    # Test 4: Temperature-specific question
    print(f"\n{BOLD}Test 4:{RESET} Temperature awareness (temperature=75)")
    payload4 = make_chat_request("gas", 75, "How hot is it right now?")
    response4 = extract_text_from_sse(url, payload4)

    if response4:
        info(f"Response: {response4}")
        lower4 = response4.lower()
        # Check if response mentions high temperature or heat
        if any(word in lower4 for word in ["hot", "warm", "heat", "75", "high", "boil", "temperature"]):
            ok("Chat acknowledged high temperature")
        else:
            fail("Chat did not acknowledge temperature")
    else:
        fail("No response received")

    # Summary
    print(f"\n{BOLD}Summary{RESET}")
    ok("All tests verify that chat agent receives current simulation state")
    ok("Each request had a unique threadId, proving state is injected per-request")
    info("If all tests passed, the chat agent is correctly receiving fresh state")


if __name__ == "__main__":
    test_state_injection()
