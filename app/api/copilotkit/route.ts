import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";

// ── Agent Configuration ─────────────────────────────────
// Connect to add_langgraph_fastapi_endpoint agents

const backendUrl = process.env.BACKEND_URL || "http://localhost:8123";

const runtime = new CopilotRuntime({
  agents: {
    "observation-changing-states": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/observation-changing-states`,
    }),
    "chat-changing-states": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/chat-changing-states`,
    }),
  },
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
