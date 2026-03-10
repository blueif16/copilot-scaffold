import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Agent Configuration ─────────────────────────────────
// Connect to add_langgraph_fastapi_endpoint agents

const backendUrl = process.env.BACKEND_URL || "http://localhost:8123";

const serviceAdapter = new ExperimentalEmptyAdapter();

const runtime = new CopilotRuntime({
  agents: {
    "observation-changing-states": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/observation-changing-states`,
    }),
    "chat-changing-states": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/chat-changing-states`,
    }),
    "observation-electric-circuits": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/observation-electric-circuits`,
    }),
    "chat-electric-circuits": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/chat-electric-circuits`,
    }),
    "observation-genetics-basics": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/observation-genetics-basics`,
    }),
    "chat-genetics-basics": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/chat-genetics-basics`,
    }),
    "course-builder": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/course-builder`,
    }),
  },
});

// ── Route Handler ───────────────────────────────────────

export const POST = async (req: NextRequest) => {
  const body = await req.text();

  // Log incoming requests
  const isAgentRun = body.includes("agent/run");
  const isStateEmit = body.includes("emit_state");
  if (isAgentRun || isStateEmit) {
    console.log("[CopilotKit→Backend]", {
      type: isAgentRun ? "agent/run" : "emit_state",
      timestamp: new Date().toISOString(),
      bodyPreview: body.substring(0, 200),
    });
  }

  // Create new request since we consumed the body
  const newReq = new NextRequest(req.url, {
    method: req.method,
    headers: req.headers,
    body: body,
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  const response = await handleRequest(newReq);

  // Log responses
  if (isAgentRun || isStateEmit) {
    console.log("[Backend→CopilotKit]", {
      status: response.status,
      contentType: response.headers.get("content-type"),
      timestamp: new Date().toISOString(),
    });
  }

  return response;
};

export const GET = async () => {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
