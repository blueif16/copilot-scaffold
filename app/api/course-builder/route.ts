import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";

// ── Agent Configuration ─────────────────────────────────
// Connect to course-builder agent in FastAPI backend

const backendUrl = process.env.BACKEND_URL || "http://localhost:8123";

const serviceAdapter = new ExperimentalEmptyAdapter();

const runtime = new CopilotRuntime({
  agents: {
    "course-builder": new LangGraphHttpAgent({
      url: `${backendUrl}/agents/course-builder`,
    }),
  },
});

// ── Route Handler ───────────────────────────────────────

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/course-builder",
  });

  return await handleRequest(req);
};

export const GET = async () => {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
