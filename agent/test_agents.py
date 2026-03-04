#!/usr/bin/env python3
"""
Omniscience Agent Diagnostic — tests both AG-UI endpoints independently
and verifies the state flow between observation → chat agents.

Usage:
    cd agent
    source .venv/bin/activate
    python test_agents.py              # quick smoke test
    python test_agents.py --verbose    # full SSE stream output
    python test_agents.py --flow       # test observation→chat state flow
"""

import argparse
import json
import sys
import time
import uuid
import httpx

BACKEND = "http://localhost:8123"
OBSERVATION_PATH = "/agents/observation-changing-states"
CHAT_PATH = "/agents/chat-changing-states"

# ── Colors ───────────────────────────────────────────────

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
DIM = "\033[2m"
RESET = "\033[0m"
BOLD = "\033[1m"


def ok(msg: str):
    print(f"  {GREEN}✓{RESET} {msg}")


def fail(msg: str):
    print(f"  {RED}✗{RESET} {msg}")


def info(msg: str):
    print(f"  {CYAN}→{RESET} {msg}")


def dim(msg: str):
    print(f"  {DIM}{msg}{RESET}")


# ── RunAgentInput builders ───────────────────────────────


def make_chat_input(user_message: str, simulation: dict = None, companion: dict = None) -> dict:
    """Build a valid AG-UI RunAgentInput for the chat agent."""
    return {
        "threadId": str(uuid.uuid4()),
        "runId": str(uuid.uuid4()),
        "state": {
            "simulation": simulation or {"phase": "solid", "temperature": 0},
            "companion": companion or {
                "currentReaction": None,
                "reactionHistory": [],
                "progress": {},
                "spotlightUnlocked": False,
                "suggestedQuestions": [],
            },
        },
        "messages": [
            {"id": str(uuid.uuid4()), "role": "user", "content": user_message}
        ],
        "tools": [],
        "context": [],
        "forwardedProps": {},
    }


def make_observation_input(
    event_type: str,
    event_data: dict,
    simulation: dict = None,
    companion: dict = None,
) -> dict:
    """Build a valid AG-UI RunAgentInput for the observation agent."""
    return {
        "threadId": str(uuid.uuid4()),
        "runId": str(uuid.uuid4()),
        "state": {
            "simulation": simulation or {"phase": "solid", "temperature": 0},
            "events": {
                "latest": {
                    "type": event_type,
                    "timestamp": int(time.time() * 1000),
                    "data": event_data,
                },
                "history": [],
            },
            "companion": companion or {
                "currentReaction": None,
                "reactionHistory": [],
                "progress": {},
                "spotlightUnlocked": False,
                "suggestedQuestions": [],
            },
            "_pending_reaction": None,
            "_ai_hint": None,
            "_event_counts": {},
        },
        "messages": [],
        "tools": [],
        "context": [],
        "forwardedProps": {},
    }


# ── SSE stream parser ───────────────────────────────────


def stream_sse(url: str, payload: dict, verbose: bool = False) -> list[dict]:
    """POST to an AG-UI endpoint, parse SSE events, return them."""
    events = []
    try:
        with httpx.stream(
            "POST",
            url,
            json=payload,
            headers={"Accept": "text/event-stream", "Content-Type": "application/json"},
            timeout=30.0,
        ) as response:
            if response.status_code != 200:
                fail(f"HTTP {response.status_code}")
                try:
                    body = response.read().decode()
                    fail(f"Response: {body[:500]}")
                except Exception:
                    pass
                return events

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
                                events.append(parsed)
                                if verbose:
                                    event_type = parsed.get("type", "?")
                                    # Colorize by event type
                                    if "ERROR" in event_type:
                                        dim(f"{RED}{event_type}{RESET}: {json.dumps(parsed, indent=2)[:200]}")
                                    elif "STARTED" in event_type or "FINISHED" in event_type:
                                        dim(f"{CYAN}{event_type}{RESET}")
                                    elif "CONTENT" in event_type:
                                        delta = parsed.get("delta", "")
                                        dim(f"{event_type}: {YELLOW}{delta}{RESET}")
                                    elif "STATE_SNAPSHOT" in event_type:
                                        snapshot = parsed.get("snapshot", {})
                                        keys = list(snapshot.keys()) if isinstance(snapshot, dict) else "?"
                                        dim(f"{event_type}: keys={keys}")
                                    elif "STEP" in event_type:
                                        dim(f"{event_type}: {parsed.get('stepName', '?')}")
                                    else:
                                        dim(f"{event_type}")
                            except json.JSONDecodeError:
                                if verbose:
                                    dim(f"(non-JSON): {data[:100]}")
    except httpx.ConnectError:
        fail(f"Connection refused — is the backend running on {BACKEND}?")
    except httpx.ReadTimeout:
        fail("Timeout waiting for response (30s)")
    except Exception as e:
        fail(f"Error: {e}")

    return events


# ── Diagnostic checks ───────────────────────────────────


def check_health():
    print(f"\n{BOLD}Health Check{RESET}")
    try:
        r = httpx.get(f"{BACKEND}/health", timeout=5)
        if r.status_code == 200:
            ok(f"Backend healthy: {r.json()}")
            return True
        else:
            fail(f"Health returned {r.status_code}")
            return False
    except httpx.ConnectError:
        fail(f"Cannot connect to {BACKEND}")
        return False


def check_agent(name: str, path: str, payload: dict, verbose: bool = False) -> list[dict]:
    url = f"{BACKEND}{path}"
    print(f"\n{BOLD}{name}{RESET}  →  POST {path}")

    if verbose:
        info(f"Payload keys: {list(payload.keys())}")
        info(f"threadId: {payload['threadId'][:12]}…")
        info(f"messages: {len(payload['messages'])}")
        state_keys = list(payload.get('state', {}).keys())
        info(f"state keys: {state_keys}")
        print()

    events = stream_sse(url, payload, verbose=verbose)

    if not events:
        fail("No events received")
        return events

    # Analyze events
    event_types = [e.get("type", "?") for e in events]
    has_run_started = "RUN_STARTED" in event_types
    has_run_finished = "RUN_FINISHED" in event_types
    has_run_error = "RUN_ERROR" in event_types
    has_text = any("TEXT_MESSAGE" in t for t in event_types)
    has_state = "STATE_SNAPSHOT" in event_types
    has_steps = any("STEP" in t for t in event_types)

    # Report
    ok(f"Received {len(events)} events")

    if has_run_started:
        ok("RUN_STARTED received")
    else:
        fail("Missing RUN_STARTED")

    if has_run_finished:
        ok("RUN_FINISHED received")
    elif has_run_error:
        error_events = [e for e in events if e.get("type") == "RUN_ERROR"]
        for err in error_events:
            fail(f"RUN_ERROR: {err.get('message', '?')}")
    else:
        fail("Missing RUN_FINISHED (and no RUN_ERROR)")

    if has_text:
        text_content = [
            e.get("delta", "") for e in events if e.get("type") == "TEXT_MESSAGE_CONTENT"
        ]
        full_text = "".join(text_content)
        ok(f"Text response: \"{full_text[:120]}{'…' if len(full_text) > 120 else ''}\"")
    else:
        info("No text messages (may be expected for observation agent)")

    if has_state:
        snapshots = [e for e in events if e.get("type") == "STATE_SNAPSHOT"]
        last = snapshots[-1].get("snapshot", {})
        if isinstance(last, dict):
            ok(f"State snapshots: {len(snapshots)}, final keys: {list(last.keys())[:8]}")
            # Check for companion reaction (observation agent)
            companion = last.get("companion", {})
            if companion.get("currentReaction"):
                reaction = companion["currentReaction"]
                ok(f"Companion reaction: {reaction.get('message', '?')[:80]}")
                ok(f"  emotion={reaction.get('emotion')}, source={reaction.get('source')}")
        else:
            ok(f"State snapshots: {len(snapshots)}")

    if has_steps:
        steps = [e.get("stepName") for e in events if e.get("type") == "STEP_STARTED"]
        ok(f"Steps executed: {' → '.join(steps)}")

    return events


def check_flow(verbose: bool = False):
    """Test the observation→chat state flow.

    Simulates: user changes temperature → observation agent reacts →
    chat agent receives companion state as context.
    """
    print(f"\n{BOLD}{'═' * 60}{RESET}")
    print(f"{BOLD}State Flow Test: Observation → Chat{RESET}")
    print(f"{BOLD}{'═' * 60}{RESET}")

    # Step 1: Observation agent processes a phase change
    print(f"\n{BOLD}Step 1:{RESET} Observation agent processes phase change")
    sim_state = {"phase": "liquid", "temperature": 50}
    obs_events = check_agent(
        "Observation Agent",
        OBSERVATION_PATH,
        make_observation_input(
            event_type="phase_change",
            event_data={"from": "solid", "to": "liquid", "times_seen": 1},
            simulation=sim_state,
        ),
        verbose=verbose,
    )

    # Extract companion state from observation output
    companion_state = None
    for event in reversed(obs_events):
        if event.get("type") == "STATE_SNAPSHOT":
            snapshot = event.get("snapshot", {})
            if isinstance(snapshot, dict) and "companion" in snapshot:
                companion_state = snapshot["companion"]
                break

    if companion_state:
        ok(f"Extracted companion state from observation agent")
        info(f"  currentReaction: {bool(companion_state.get('currentReaction'))}")
        info(f"  reactionHistory: {len(companion_state.get('reactionHistory', []))} entries")
    else:
        info("No companion state in observation output (agent may have decided not to react)")
        companion_state = {
            "currentReaction": None,
            "reactionHistory": [],
            "progress": {},
            "spotlightUnlocked": False,
        }

    # Step 2: Chat agent receives the companion state
    print(f"\n{BOLD}Step 2:{RESET} Chat agent receives companion context + user question")
    chat_events = check_agent(
        "Chat Agent",
        CHAT_PATH,
        make_chat_input(
            user_message="Why did the ice melt when I moved the slider?",
            simulation=sim_state,
            companion=companion_state,
        ),
        verbose=verbose,
    )

    # Verify chat agent produced a contextual response
    text_content = [
        e.get("delta", "") for e in chat_events if e.get("type") == "TEXT_MESSAGE_CONTENT"
    ]
    full_text = "".join(text_content)

    if full_text:
        # Check if response references the simulation state
        lower = full_text.lower()
        context_aware = any(
            word in lower
            for word in ["melt", "liquid", "temperature", "heat", "warm", "ice", "water", "slider"]
        )
        if context_aware:
            ok(f"Chat response is context-aware (references simulation state)")
        else:
            info(f"Chat responded but may not reference simulation context")
    else:
        fail("Chat agent produced no text response")

    # Summary
    print(f"\n{BOLD}Flow Summary{RESET}")
    obs_ok = any(e.get("type") == "RUN_FINISHED" for e in obs_events)
    chat_ok = any(e.get("type") == "RUN_FINISHED" for e in chat_events)

    if obs_ok and chat_ok:
        ok("Both agents completed successfully")
        ok(f"Observation → {len(obs_events)} events → companion state extracted")
        ok(f"Chat (with companion context) → {len(chat_events)} events → response generated")
    elif obs_ok:
        ok("Observation agent OK")
        fail("Chat agent failed")
    elif chat_ok:
        fail("Observation agent failed")
        ok("Chat agent OK")
    else:
        fail("Both agents failed")


# ── Main ─────────────────────────────────────────────────


def main():
    global BACKEND

    parser = argparse.ArgumentParser(description="Test Omniscience AG-UI agents")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show full SSE event stream")
    parser.add_argument("--flow", "-f", action="store_true", help="Test observation→chat state flow")
    parser.add_argument("--chat-only", action="store_true", help="Test chat agent only")
    parser.add_argument("--obs-only", action="store_true", help="Test observation agent only")
    parser.add_argument("--backend", default=None, help=f"Backend URL (default: {BACKEND})")
    args = parser.parse_args()

    if args.backend:
        BACKEND = args.backend

    print(f"{BOLD}Omniscience Agent Diagnostic{RESET}")
    print(f"Backend: {BACKEND}")

    if not check_health():
        sys.exit(1)

    if args.flow:
        check_flow(verbose=args.verbose)
        return

    if not args.chat_only:
        check_agent(
            "Observation Agent",
            OBSERVATION_PATH,
            make_observation_input(
                event_type="temperature_change",
                event_data={"from": 0, "to": 25, "phase": "liquid"},
                simulation={"phase": "liquid", "temperature": 25},
            ),
            verbose=args.verbose,
        )

    if not args.obs_only:
        check_agent(
            "Chat Agent",
            CHAT_PATH,
            make_chat_input("What happens when ice melts?"),
            verbose=args.verbose,
        )

    print()


if __name__ == "__main__":
    main()
