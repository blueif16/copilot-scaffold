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

// Wrap LangGraphAgent to handle "Message not found" errors gracefully
class SafeLangGraphAgent extends LangGraphAgent {
  run(input: any) {
    const observable = super.run(input);
    return new (require("rxjs").Observable)((subscriber: any) => {
      const subscription = observable.subscribe({
        next: (value: any) => subscriber.next(value),
        error: (error: any) => {
          // Handle "Message not found" errors gracefully
          if (error?.message?.includes("Message not found")) {
            console.warn(
              "[LangGraph] Message checkpoint not found - ignoring regenerate attempt:",
              error.message
            );
            subscriber.complete();
          } else {
            subscriber.error(error);
          }
        },
        complete: () => subscriber.complete(),
      });
      return () => subscription.unsubscribe();
    });
  }
}

const runtime = new CopilotRuntime({
  agents: {
    "observation-changing-states": new SafeLangGraphAgent({
      deploymentUrl,
      graphId: "observation-changing-states",
      langsmithApiKey,
    }),
    "chat-changing-states": new SafeLangGraphAgent({
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

export const GET = async () => {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
