"""
Middleware to fix CopilotKit LangGraphHttpAgent protocol bugs.

Issues fixed:
1. context field: {} -> []
2. messages missing id field
3. Missing threadId, runId, state, tools, forwardedProps fields
4. Extract user_id from Authorization header and inject into config
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import json
import uuid


class FixAGUIProtocolMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"[FixAGUIProtocol] Processing {request.method} {request.url.path}")

        if request.method == "POST" and "/agents/" in str(request.url):
            # Read the body
            body_bytes = await request.body()
            print(f"[FixAGUIProtocol] Body length: {len(body_bytes)}")

            try:
                data = json.loads(body_bytes)
                print(f"[FixAGUIProtocol] Parsed data keys: {list(data.keys())}")
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
                    # Use copilotkit field if present, otherwise empty dict
                    data["forwardedProps"] = data.get("copilotkit", {})
                    modified = True

                # Fix 7: messages need id field
                if "messages" in data and isinstance(data["messages"], list):
                    for msg in data["messages"]:
                        if isinstance(msg, dict) and "id" not in msg:
                            msg["id"] = str(uuid.uuid4())
                            modified = True

                # Fix 8: Extract user_id from Authorization header and inject into config
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ", 1)[1]
                    # Verify token and extract user_id
                    try:
                        from middleware.auth import verify_token
                        user_data = await verify_token(token)
                        user_id = user_data.get("id")

                        if user_id:
                            # Inject user_id into config.configurable
                            if "config" not in data:
                                data["config"] = {}
                            if "configurable" not in data["config"]:
                                data["config"]["configurable"] = {}
                            data["config"]["configurable"]["user_id"] = user_id
                            modified = True
                            print(f"[FixAGUIProtocol] Injected user_id={user_id} into config")
                    except Exception as e:
                        print(f"[FixAGUIProtocol] Failed to extract user_id: {e}")
                        # Continue without user_id - don't block the request

                if modified:
                    print(f"[FixAGUIProtocol] Fixed request: threadId={data.get('threadId')}, runId={data.get('runId')}, {len(data.get('messages', []))} messages")
                    # Create new request with fixed body
                    async def receive():
                        return {"type": "http.request", "body": json.dumps(data).encode()}

                    request._receive = receive

            except Exception as e:
                print(f"[FixAGUIProtocol] Error: {e}")

        response = await call_next(request)
        return response
