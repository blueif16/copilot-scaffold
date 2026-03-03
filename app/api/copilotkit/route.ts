import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";

// ── Agent Configuration ─────────────────────────────────
// Graph IDs MUST exactly match langgraph.json + useCoAgent names

const deploymentUrl =
  process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123";
const langsmithApiKey = process.env.LANGSMITH_API_KEY || "";

const runtime = new CopilotRuntime({
  agents: {
    "observation-changing-states": new LangGraphAgent({
      deploymentUrl,
      graphId: "observation-changing-states",
      langsmithApiKey,
    }),
    "chat-changing-states": new LangGraphAgent({
      deploymentUrl,
      graphId: "chat-changing-states",
      langsmithApiKey,
    }),
  },
});

// ── Route Handler ───────────────────────────────────────

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
