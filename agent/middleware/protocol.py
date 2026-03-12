"""
Raw ASGI middleware to fix CopilotKit AG-UI protocol request fields.

CRITICAL: This MUST be raw ASGI middleware, NOT BaseHTTPMiddleware.
BaseHTTPMiddleware buffers entire responses, destroying SSE/StreamingResponse.
See: code_failures/bugs/starlette-BaseHTTPMiddleware-breaks-sse.md

Issues fixed:
1. context field: {} -> []
2. messages missing id field
3. Missing threadId, runId, state, tools, forwardedProps fields
4. Extract user_id from Authorization header and inject into config
"""
from starlette.types import ASGIApp, Receive, Scope, Send
import json
import uuid


class FixAGUIProtocolMiddleware:
    """Raw ASGI middleware — transforms request body without buffering responses.

    BaseHTTPMiddleware would destroy AG-UI's SSE streaming.
    This intercepts `receive` to patch request JSON while passing
    `send` through untouched so StreamingResponse works correctly.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Only intercept HTTP POST requests to agent endpoints
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "")

        # Only process POST requests to agent endpoints
        if method != "POST" or "/agents/" not in path:
            await self.app(scope, receive, send)
            return

        is_course_builder = "course-builder" in path
        log_prefix = "[wt-main][FixAGUIProtocol]" if is_course_builder else "[FixAGUIProtocol]"
        print(f"{log_prefix} Processing POST {path}")

        # Collect the full request body
        body_chunks: list[bytes] = []
        body_complete = False
        patched_body_sent = False

        async def patched_receive() -> dict:
            nonlocal body_complete, patched_body_sent

            if body_complete:
                # After we've sent the patched body, pass through to original receive
                # This allows the ASGI app to properly close the connection
                if patched_body_sent:
                    return await receive()
                patched_body_sent = True
                return {"type": "http.request", "body": b"", "more_body": False}

            # Accumulate chunks until the full body arrives
            message = await receive()
            chunk = message.get("body", b"")
            more = message.get("more_body", False)
            body_chunks.append(chunk)

            if not more:
                # Full body received — patch it
                body_complete = True
                full_body = b"".join(body_chunks)

                try:
                    data = json.loads(full_body)
                    if is_course_builder:
                        print(f"{log_prefix} Original body keys: {list(data.keys())}")
                        print(f"{log_prefix} Original body size: {len(full_body)} bytes")
                    modified = False

                    # Fix 1: Add missing threadId
                    if "threadId" not in data:
                        data["threadId"] = str(uuid.uuid4())
                        modified = True

                    # Fix 2: Add missing runId
                    if "runId" not in data:
                        data["runId"] = str(uuid.uuid4())
                        modified = True

                    # Fix 3: Add missing state
                    if "state" not in data:
                        data["state"] = {}
                        modified = True

                    # Fix 4: Add missing tools
                    if "tools" not in data:
                        data["tools"] = []
                        modified = True

                    # Fix 5: context should be [] not {}
                    if "context" in data and isinstance(data["context"], dict) and len(data["context"]) == 0:
                        data["context"] = []
                        modified = True
                    elif "context" not in data:
                        data["context"] = []
                        modified = True

                    # Fix 6: Add missing forwardedProps
                    if "forwardedProps" not in data:
                        data["forwardedProps"] = data.get("copilotkit", {})
                        modified = True

                    # Fix 7: messages need id field
                    if "messages" in data and isinstance(data["messages"], list):
                        for msg in data["messages"]:
                            if isinstance(msg, dict) and "id" not in msg:
                                msg["id"] = str(uuid.uuid4())
                                modified = True

                    # Fix 8: Extract user_id from Authorization header
                    headers_dict = dict(scope.get("headers", []))
                    auth_value = headers_dict.get(b"authorization", b"").decode("utf-8", errors="ignore")
                    if auth_value.startswith("Bearer "):
                        token = auth_value.split(" ", 1)[1]
                        try:
                            from middleware.auth import verify_token
                            user_data = await verify_token(token)
                            user_id = user_data.get("id") if user_data else None

                            if user_id:
                                if "config" not in data:
                                    data["config"] = {}
                                if "configurable" not in data["config"]:
                                    data["config"]["configurable"] = {}
                                data["config"]["configurable"]["user_id"] = user_id
                                modified = True
                                print(f"{log_prefix} Injected user_id={user_id}")
                        except Exception as e:
                            print(f"{log_prefix} Failed to extract user_id: {e}")

                    if modified:
                        msg_count = len(data.get("messages", []))
                        print(f"{log_prefix} Patched: threadId={data.get('threadId', '?')[:8]}..., {msg_count} messages")
                        if is_course_builder:
                            print(f"{log_prefix} Patched body keys: {list(data.keys())}")
                            print(f"{log_prefix} Required fields present: threadId={bool(data.get('threadId'))}, runId={bool(data.get('runId'))}, state={bool('state' in data)}, tools={bool('tools' in data)}, context={bool('context' in data)}, forwardedProps={bool('forwardedProps' in data)}")
                        full_body = json.dumps(data).encode()
                        if is_course_builder:
                            print(f"{log_prefix} Patched body size: {len(full_body)} bytes")
                            print(f"{log_prefix} Patched body is valid JSON: {True}")
                    elif is_course_builder:
                        print(f"{log_prefix} No modifications needed (all fields present)")

                except Exception as e:
                    print(f"{log_prefix} Parse error (passing through): {e}")
                    if is_course_builder:
                        print(f"{log_prefix} ERROR: Failed to parse/patch request body")

                return {"type": "http.request", "body": full_body, "more_body": False}

            # Still accumulating — pass chunk through
            return message

        # Pass patched receive to the app, send goes through untouched
        await self.app(scope, patched_receive, send)
