#!/usr/bin/env python3
"""
MCP client for teaching-db server (SSE transport).
Wraps MCP tools as LangChain @tool for use in LangGraph.

Usage:
    python mcp_client.py list-tools
    python mcp_client.py call <tool> [args_json]
"""
import urllib.request
import json
import logging
import sys
import argparse
import threading
import queue
from typing import Any, Optional

logger = logging.getLogger(__name__)

SERVER_URL = "http://47.95.179.148:9999"


class MCPClient:
    """MCP client using SSE transport. Thread-safe, reusable."""

    def __init__(self, server_url: str = SERVER_URL):
        self.server_url = server_url
        self.session_id: str | None = None
        self.request_id = 1
        self.response_queue: queue.Queue = queue.Queue()
        self.sse_thread: threading.Thread | None = None

    def connect(self) -> "MCPClient":
        """Establish SSE connection and get session_id."""
        req = urllib.request.Request(f"{self.server_url}/sse")
        resp = urllib.request.urlopen(req, timeout=10)
        for line in resp:
            line = line.decode().strip()
            if "session_id" in line:
                self.session_id = line.split("session_id=")[1].strip()
                self.sse_thread = threading.Thread(target=self._sse_reader, args=(resp,), daemon=True)
                self.sse_thread.start()
                self._send_init()
                return self
        raise RuntimeError("Failed to get session_id from SSE stream")

    def _is_connected(self) -> bool:
        """Check if SSE reader thread is still alive."""
        return self.sse_thread is not None and self.sse_thread.is_alive()

    def _ensure_connected(self):
        """Reconnect if the SSE reader thread has died."""
        if not self._is_connected():
            logger.info("[MCP] SSE connection lost, reconnecting...")
            # Drain stale responses
            while not self.response_queue.empty():
                try:
                    self.response_queue.get_nowait()
                except queue.Empty:
                    break
            self.connect()

    def _sse_reader(self, resp):
        """Background thread: read SSE stream, queue JSON-RPC responses."""
        try:
            for line in resp:
                line = line.decode().strip()
                if line.startswith("data:"):
                    data = line[5:].strip()
                    try:
                        self.response_queue.put(json.loads(data))
                    except json.JSONDecodeError:
                        pass
        except Exception:
            pass
        logger.info("[MCP] SSE reader thread exiting")

    def _send_init(self):
        """Send MCP handshake: initialize + notifications/initialized."""
        self._post({"jsonrpc": "2.0", "method": "initialize", "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "mcp-cli", "version": "1.0"}
        }, "id": 1})
        self._wait_response(1, timeout=5)
        self._post({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}, notification=True)

    def _post(self, payload: dict, notification: bool = False):
        """POST JSON-RPC message to messages endpoint."""
        if notification:
            payload = {k: v for k, v in payload.items() if k != "id"}
        req = urllib.request.Request(
            f"{self.server_url}/messages/?session_id={self.session_id}",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read()

    def _wait_response(self, req_id: int, timeout: float = 10) -> Optional[dict]:
        """Wait for JSON-RPC response with matching id."""
        while True:
            try:
                obj = self.response_queue.get(timeout=timeout)
                if obj.get("id") == req_id:
                    if "result" in obj:
                        return obj["result"]
                    return obj.get("error")
            except queue.Empty:
                return None

    def call(self, tool_name: str, arguments: Optional[dict] = None) -> Any:
        """Call a tool, return result content."""
        self._ensure_connected()
        payload = {"jsonrpc": "2.0", "method": "tools/call", "params": {
            "name": tool_name, "arguments": arguments or {}
        }, "id": self.request_id}
        req_id = self.request_id
        self.request_id += 1
        self._post(payload)
        result = self._wait_response(req_id)
        if isinstance(result, dict) and "content" in result:
            return result["content"]
        return result

    def list_tools(self) -> list[dict]:
        """List all available tools with their schemas."""
        self._post({"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": self.request_id})
        req_id = self.request_id
        self.request_id += 1
        result = self._wait_response(req_id)
        return result.get("tools", []) if result else []


# ---------------------------------------------------------------------------
# LangChain tool adapter
# ---------------------------------------------------------------------------

def create_mcp_tool(mcp_client: MCPClient, tool_def: dict):
    """Create a LangChain @tool from an MCP tool definition."""
    from langchain_core.tools import tool

    name = tool_def["name"]
    description = tool_def.get("description", "")
    input_schema = tool_def.get("inputSchema", {})

    @tool
    def mcp_wrapper(**kwargs) -> str:
        """Dynamically wrapped MCP tool."""
        result = mcp_client.call(name, kwargs)
        return json.dumps(result, ensure_ascii=False)

    mcp_wrapper.name = name
    mcp_wrapper.description = description
    mcp_wrapper.args_schema = _json_schema_to_pydantic(name, input_schema)
    return mcp_wrapper


def _json_schema_to_pydantic(name: str, schema: dict):
    """Convert JSON Schema to Pydantic model for tool args."""
    from pydantic import create_model, Field as PydanticField

    properties = schema.get("properties", {})
    required = schema.get("required", [])
    fields = {}
    for param_name, param_def in properties.items():
        typ = param_def.get("type", "string")
        py_type = _json_to_python_type(typ)
        default = ... if param_name in required else None
        fields[param_name] = (py_type, PydanticField(default=default, description=param_def.get("description", "")))

    return create_model(f"{name}Args", **fields)


def _json_to_python_type(json_type: str):
    """Map JSON type to Python type."""
    return {
        "string": str,
        "integer": int,
        "number": float,
        "boolean": bool,
        "object": dict,
        "array": list,
        "null": type(None),
    }.get(json_type, str)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="MCP Client for teaching-db")
    parser.add_argument("command", choices=["list-tools", "call"])
    parser.add_argument("tool", nargs="?", help="Tool name (for 'call' command)")
    parser.add_argument("args", nargs="?", help="JSON arguments string")
    args = parser.parse_args()

    client = MCPClient()
    print("Connecting to MCP server...", file=sys.stderr)
    client.connect()
    print(f"Connected (session={client.session_id[:16]}...)", file=sys.stderr)

    if args.command == "list-tools":
        tools = client.list_tools()
        print(json.dumps(tools, indent=2, ensure_ascii=False))
    elif args.command == "call":
        if not args.tool:
            print("Error: tool name required", file=sys.stderr)
            sys.exit(1)
        arguments = json.loads(args.args) if args.args else {}
        result = client.call(args.tool, arguments)
        print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
