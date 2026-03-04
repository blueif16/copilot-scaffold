import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";

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
  },
});

// ── Route Handler ───────────────────────────────────────

export const POST = async (req: NextRequest) => {
  const body = await req.text();
  // console.log("[CopilotKit] Request:", {
  //   url: req.url,
  //   bodyPreview: body.substring(0, 300),
  // });

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

  // console.log("[CopilotKit] Response:", {
  //   status: response.status,
  //   contentType: response.headers.get("content-type"),
  // });

  // Log response body for debugging
  // if (body.includes("agent/run")) {
  //   const clone = response.clone();
  //   const text = await clone.text();
  //   console.log("[CopilotKit] Response body preview:", text.substring(0, 500));
  // }

  return response;
};

export const GET = async () => {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
