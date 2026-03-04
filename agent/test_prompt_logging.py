#!/usr/bin/env python3
"""
Test to verify system prompt is rebuilt with fresh state.
Run this and watch the backend console output.

Usage:
    cd agent
    source .venv/bin/activate
    python test_prompt_logging.py
"""

import json
import time
import uuid
import httpx

BACKEND = "http://localhost:8123"
CHAT_PATH = "/agents/chat-changing-states"

BOLD = "\033[1m"
CYAN = "\033[96m"
RESET = "\033[0m"


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


def send_request(url: str, payload: dict):
    """Send request and consume response."""
    try:
        with httpx.stream(
            "POST",
            url,
            json=payload,
            headers={"Accept": "text/event-stream", "Content-Type": "application/json"},
            timeout=30.0,
        ) as response:
            # Just consume the response
            for _ in response.iter_text():
                pass
    except Exception as e:
        print(f"Error: {e}")


def main():
    print(f"\n{BOLD}System Prompt Logging Test{RESET}")
    print("Watch the backend console for system prompt output\n")

    url = f"{BACKEND}{CHAT_PATH}"

    print(f"{CYAN}Request 1:{RESET} Solid state (temp=10)")
    print("Expected in system prompt: phase='solid', temperature=10\n")
    payload1 = make_chat_request("solid", 10, "What state is this?")
    send_request(url, payload1)
    time.sleep(2)

    print(f"\n{CYAN}Request 2:{RESET} Liquid state (temp=50)")
    print("Expected in system prompt: phase='liquid', temperature=50\n")
    payload2 = make_chat_request("liquid", 50, "What state is this?")
    send_request(url, payload2)
    time.sleep(2)

    print(f"\n{CYAN}Request 3:{RESET} Gas state (temp=90)")
    print("Expected in system prompt: phase='gas', temperature=90\n")
    payload3 = make_chat_request("gas", 90, "What state is this?")
    send_request(url, payload3)

    print(f"\n{BOLD}Done!{RESET}")
    print("Check the backend console output above to see the system prompts.")
    print("Each request should show different simulation state values.\n")


if __name__ == "__main__":
    main()
