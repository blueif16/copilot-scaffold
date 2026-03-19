"use client";

import { useState, Suspense } from "react";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { WidgetShell } from "./widgets/shared/WidgetShell";
import { ToolStatusCard } from "./ui/ToolStatusCard";
import { widgetEntries, type WidgetEntry } from "@/lib/widgetEntries";
import { configToZod } from "@/lib/configToZod";
import type { WidgetLayout } from "@/types/state";

interface SpawnedWidget {
  id: string;
  Component: React.ComponentType<any>;
  props: Record<string, any>;
}

type SpawnSetter = React.Dispatch<React.SetStateAction<SpawnedWidget[]>>;

/** Build a layout hint string for the tool description so the LLM knows widget size. */
function layoutHint(layout?: WidgetLayout): string {
  const w = layout?.width ?? "half";
  const h = layout?.height ?? "compact";
  return `[Layout: ${w} width, ${h} height]`;
}

/** Map layout config to CSS classes. */
function layoutClasses(layout?: WidgetLayout): string {
  const w = layout?.width ?? "half";
  const h = layout?.height ?? "compact";

  const widthClass =
    w === "full" ? "col-span-2" : w === "third" ? "col-span-1" : "col-span-1";

  const heightClass =
    h === "fill"
      ? "min-h-[calc(100vh-8rem)]"
      : h === "tall"
      ? "min-h-[500px]"
      : h === "medium"
      ? "min-h-[300px]"
      : "";

  return `${widthClass} ${heightClass}`.trim();
}

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

  // Append layout info to tool description so the LLM knows the widget's size
  const description = `${entry.config.tool.description} ${layoutHint(entry.config.layout)}`;

  useFrontendTool({
    name: entry.config.tool.name,
    description,
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
      <div className="grid grid-cols-2 gap-4 h-full auto-rows-min">
        {spawned.length === 0 && (
          <div className="col-span-2 flex items-center justify-center text-muted-foreground h-full">
            <p>Chat with the agent to get started</p>
          </div>
        )}

        {spawned.map(({ id, Component, props }) => {
          const entry = widgetEntries.find((e) => e.config.id === id);

          return (
            <div key={id} className={layoutClasses(entry?.config.layout)}>
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
