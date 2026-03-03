import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  RemoteChain,
} from "@copilotkit/runtime";

// ── Agent Configuration ─────────────────────────────────
// Connect to ag_ui_langgraph endpoints

const backendUrl = process.env.BACKEND_URL || "http://localhost:8123";

const runtime = new CopilotRuntime({
  remoteChains: [
    new RemoteChain({
      name: "observation-changing-states",
      url: `${backendUrl}/copilotkit/agent/observation-changing-states`,
    }),
    new RemoteChain({
      name: "chat-changing-states",
      url: `${backendUrl}/copilotkit/agent/chat-changing-states`,
    }),
  ],
});

// ── Route Handler ───────────────────────────────────────

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};

export const GET = async () => {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
