import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

const runtime = new CopilotRuntime({
  agents: {
    default: new LangGraphHttpAgent({
      url: process.env.BACKEND_URL || "http://localhost:8000/copilotkit",
    }),
  },
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
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

export const maxDuration = 60;
