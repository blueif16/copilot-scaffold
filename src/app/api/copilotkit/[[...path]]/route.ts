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
    console.log("[route.ts] path:", new URL(req.url).pathname);
    console.log("[route.ts] tools count:", body.tools?.length ?? "no tools key");
    if (body.tools?.length > 0) {
      console.log("[route.ts] tool names:", body.tools.map((t: any) => t.name));
    }
  } catch (e) {
    console.log("[route.ts] could not parse body");
  }
  return app.fetch(req);
};

export const GET = (req: Request) => app.fetch(req);
