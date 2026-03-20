import {
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkitnext/runtime";
import { HttpAgent } from "@ag-ui/client";

const runtime = new CopilotRuntime({
  agents: {
    orchestrator: new HttpAgent({
      url: process.env.REMOTE_ACTION_URL || "http://localhost:8000/copilotkit",
    }),
  },
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const POST = async (req: Request) => {
  const cloned = req.clone();
  try {
    const body = await cloned.json();
    const path = new URL(req.url).pathname;
    console.log("[route.ts] POST path:", path);
    // top-level tools (REST multi-route transport)
    const topTools = body.tools;
    // single-route envelope
    const envelopeTools = body.body?.tools;
    console.log("[route.ts] body keys:", Object.keys(body));
    console.log("[route.ts] body.tools:", Array.isArray(topTools) ? `count=${topTools.length} names=${topTools.map((t: any) => t.name).join(',')}` : topTools ?? 'MISSING');
    console.log("[route.ts] body.body?.tools:", Array.isArray(envelopeTools) ? `count=${envelopeTools.length} names=${envelopeTools.map((t: any) => t.name).join(',')}` : envelopeTools ?? 'MISSING');
    console.log("[route.ts] raw body (first 2000):", JSON.stringify(body).slice(0, 2000));
  } catch (e) {
    console.log("[route.ts] could not parse body:", e);
  }
  return app.fetch(req);
};

export const GET = (req: Request) => app.fetch(req);
