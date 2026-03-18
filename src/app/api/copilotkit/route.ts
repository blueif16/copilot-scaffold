import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";

const serviceAdapter = new ExperimentalEmptyAdapter();

const runtime = new CopilotRuntime({
  remoteEndpoints: [
    {
      url: process.env.BACKEND_URL || "http://localhost:8000/copilotkit",
    },
  ],
  // MCP servers — tools discovered at runtime
  // Configure via MCP_SERVERS env var: [{"endpoint":"https://your-mcp-server.com/sse"}]
  mcpServers: (() => {
    try {
      return JSON.parse(process.env.MCP_SERVERS || "[]");
    } catch {
      return [];
    }
  })(),
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

export const maxDuration = 60;
