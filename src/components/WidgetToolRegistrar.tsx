"use client";

import { useFrontendTool, useCopilotKit } from "@copilotkitnext/react";
import { z } from "zod";
import type { WidgetEntry, SpawnedWidget } from "@/lib/types";
import { Dispatch, SetStateAction, useEffect } from "react";

interface Props {
  entry: WidgetEntry;
  setSpawned: Dispatch<SetStateAction<SpawnedWidget[]>>;
}

export function WidgetToolRegistrar({ entry, setSpawned }: Props) {
  const { copilotkit } = useCopilotKit();
  console.log(`[WT] mount: ${entry.config.tool.name} tools=${(copilotkit as any).runHandler?._tools?.length ?? 'N/A'}`);
  // Build a proper Zod schema — this MUST be z.object(), not a plain object
  const parameters = z.object(
    Object.fromEntries(
      Object.entries(entry.config.tool.parameters).map(([key, param]) => {
        let schema: z.ZodTypeAny;
        switch (param.type) {
          case "number":
            schema = z.number().describe(param.description || "");
            break;
          case "boolean":
            schema = z.boolean().describe(param.description || "");
            break;
          default:
            schema = z.string().describe(param.description || "");
        }
        if (param.default !== undefined) {
          schema = schema.default(param.default);
        }
        return [key, schema];
      })
    )
  );

  useFrontendTool(
    {
      name: entry.config.tool.name,
      description: entry.config.tool.description,
      parameters,
      handler: async (args) => {
        setSpawned((prev) => [
          ...prev.filter((w) => w.id !== entry.config.id),
          { id: entry.config.id, Component: entry.Component, props: args },
        ]);
        return JSON.stringify({ spawned: true, widgetId: entry.config.id });
      },
      render: ({ status }) => (
        <div className="text-sm text-muted-foreground">
          {status === "complete" ? "done" : "loading"} {entry.config.tool.name}
        </div>
      ),
    },
    [] // dependency array — important for stable hook identity
  );

  useEffect(() => {
    const tools = (copilotkit as any).runHandler?._tools ?? [];
    console.log(`[WT] addTool effect fired: name=${entry.config.tool.name} total_tools=${tools.length} all=${tools.map((t: any) => t.name).join(',')}`);
  });

  return null;
}