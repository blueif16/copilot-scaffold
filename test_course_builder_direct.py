#!/usr/bin/env python3
"""
Direct test of course-builder agent endpoint.
Tests if the agent responds after removing mutable defaults from CourseBuilderState.
"""
import requests
import json
import sys

BACKEND_URL = "http://localhost:8123"
ENDPOINT = f"{BACKEND_URL}/agents/course-builder"

def test_course_builder():
    """Send a test request to course-builder agent."""

    payload = {
        "threadId": "test-thread-1",
        "runId": "test-run-1",
        "state": {
            "files": {},
            "uploaded_images": []
        },
        "messages": [
            {
                "id": "msg-1",
                "role": "user",
                "content": "你好，请帮我创建一个关于水循环的课程"
            }
        ],
        "tools": [],
        "context": [],
        "forwardedProps": {}
    }

    print(f"[TEST] Sending request to {ENDPOINT}")
    print(f"[TEST] Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")

    try:
        response = requests.post(
            ENDPOINT,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream"
            },
            stream=True,
            timeout=30
        )

        print(f"\n[TEST] Response status: {response.status_code}")
        print(f"[TEST] Response headers: {dict(response.headers)}")

        if response.status_code != 200:
            print(f"[TEST] ERROR: Expected 200, got {response.status_code}")
            print(f"[TEST] Response body: {response.text}")
            return False

        print("\n[TEST] SSE Events:")
        print("-" * 80)

        event_count = 0
        run_started = False
        text_message_received = False
        run_finished = False

        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                print(decoded)

                if decoded.startswith('data: '):
                    event_count += 1
                    try:
                        event_data = json.loads(decoded[6:])
                        event_type = event_data.get('type')

                        if event_type == 'RUN_STARTED':
                            run_started = True
                            print(f"[TEST] ✓ RUN_STARTED received")
                        elif event_type and event_type.startswith('TEXT_MESSAGE'):
                            text_message_received = True
                            print(f"[TEST] ✓ {event_type} received")
                        elif event_type == 'RUN_FINISHED':
                            run_finished = True
                            print(f"[TEST] ✓ RUN_FINISHED received")
                            break
                    except json.JSONDecodeError:
                        pass

        print("-" * 80)
        print(f"\n[TEST] Summary:")
        print(f"  Total events: {event_count}")
        print(f"  RUN_STARTED: {'✓' if run_started else '✗'}")
        print(f"  TEXT_MESSAGE: {'✓' if text_message_received else '✗'}")
        print(f"  RUN_FINISHED: {'✓' if run_finished else '✗'}")

        if run_started and text_message_received and run_finished:
            print("\n[TEST] ✓ SUCCESS: Agent executed and responded!")
            return True
        else:
            print("\n[TEST] ✗ FAILURE: Agent did not complete properly")
            return False

    except requests.exceptions.Timeout:
        print(f"\n[TEST] ✗ TIMEOUT: Request timed out after 30s")
        return False
    except Exception as e:
        print(f"\n[TEST] ✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_course_builder()
    sys.exit(0 if success else 1)
