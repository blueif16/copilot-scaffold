"use client";

import { useState, useCallback, Suspense } from "react";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { WidgetShell } from "./widgets/shared/WidgetShell";
import { ToolStatusCard } from "./ui/ToolStatusCard";
import { widgetEntries, type WidgetEntry } from "@/lib/widgetEntries";
import { configToZod } from "@/lib/configToZod";

interface SpawnedWidget {
  id: string;
  Component: React.ComponentType<any>;
  props: Record<string, any>;
}

type SpawnSetter = React.Dispatch<React.SetStateAction<SpawnedWidget[]>>;

/**
 * Registers a single widget's frontend tool.
 * Rendered once per widget entry to satisfy React hooks rules.
 */
function WidgetToolRegistrar({
  entry,
  setSpawned,
}: {
  entry: WidgetEntry;
  setSpawned: SpawnSetter;
}) {
  const zodSchema = configToZod(entry.config.tool.parameters);

  useFrontendTool({
    name: entry.config.tool.name,
    description: entry.config.tool.description,
    parameters: zodSchema,
    handler: async (args: Record<string, any>) => {
      setSpawned((prev) => [
        ...prev.filter((w) => w.id !== entry.config.id),
        { id: entry.config.id, Component: entry.Component, props: args },
      ]);
      return JSON.stringify({ spawned: true, widgetId: entry.config.id });
    },
    render: ({ status }) => (
      <ToolStatusCard
        name={entry.config.tool.name}
        status={status === "complete" ? "complete" : "executing"}
      />
    ),
  });

  return null;
}

export function WidgetPanel() {
  const [spawned, setSpawned] = useState<SpawnedWidget[]>([]);

  return (
    <>
      {/* Register frontend tools — one per widget */}
      {widgetEntries.map((entry) => (
        <WidgetToolRegistrar
          key={entry.config.id}
          entry={entry}
          setSpawned={setSpawned}
        />
      ))}

      {/* Render spawned widgets */}
      <div className="grid grid-cols-2 gap-4 h-full">
        {spawned.length === 0 && (
          <div className="col-span-2 flex items-center justify-center text-muted-foreground h-full">
            <p>Chat with the agent to get started</p>
          </div>
        )}

        {spawned.map(({ id, Component, props }) => {
          const entry = widgetEntries.find((e) => e.config.id === id);
          const slot = entry?.config.layout?.slot ?? "half";

          return (
            <div
              key={id}
              className={
                slot === "full"
                  ? "col-span-2"
                  : slot === "third"
                  ? "col-span-1"
                  : "col-span-1"
              }
            >
              <WidgetShell label={id}>
                <Suspense
                  fallback={
                    <div className="animate-pulse h-32 bg-muted rounded" />
                  }
                >
                  <Component {...props} widgetId={id} />
                </Suspense>
              </WidgetShell>
            </div>
          );
        })}
      </div>
    </>
  );
}
