"use client";

import { useState, Suspense, useMemo } from "react";
import { WidgetShell } from "./widgets/shared/WidgetShell";
import { widgetEntries, type WidgetEntry } from "@/lib/widgetEntries";
import { WidgetToolRegistrar } from "./WidgetToolRegistrar";
import type { SpawnedWidget } from "@/lib/types";
import type { WidgetLayout } from "@/types/state";

function layoutClasses(layout?: WidgetLayout): string {
  const w = layout?.width ?? "half";
  const h = layout?.height ?? "compact";

  // Column span: explicit colSpan overrides width
  let widthClass: string;
  if (layout?.colSpan) {
    const span = Math.min(Math.max(layout.colSpan, 1), 4);
    widthClass = `col-span-${span}`;
  } else {
    widthClass =
      w === "full" ? "col-span-4" : w === "third" ? "col-span-1" : w === "quarter" ? "col-span-1" : "col-span-2";
  }

  // Row span
  const rowClass = layout?.rowSpan && layout.rowSpan > 1 ? `row-span-${layout.rowSpan}` : "";

  const heightClass =
    h === "fill"
      ? "min-h-[calc(100vh-8rem)]"
      : h === "tall"
      ? "min-h-[500px]"
      : h === "medium"
      ? "min-h-[300px]"
      : "";
  return `${widthClass} ${rowClass} ${heightClass}`.trim();
}

interface WidgetPanelProps {
  spawned?: SpawnedWidget[];
}

export function WidgetPanel({ spawned: externalSpawned }: WidgetPanelProps) {
  const [internalSpawned, setSpawned] = useState<SpawnedWidget[]>([]);
  const spawned = externalSpawned ?? internalSpawned;

  // CRITICAL: Deduplicate by tool name
  const uniqueEntries = useMemo(() => {
    const seen = new Set<string>();
    return widgetEntries.filter((entry) => {
      if (seen.has(entry.config.tool.name)) {
        console.warn(`[WidgetPanel] Skipping duplicate tool: ${entry.config.tool.name}`);
        return false;
      }
      seen.add(entry.config.tool.name);
      return true;
    });
  }, []);

  console.log(`[WidgetPanel] Unique entries: ${uniqueEntries.length}`);
  console.log(`[WidgetPanel] Tool names:`, uniqueEntries.map(e => e.config.tool.name));

  return (
    <div>
      {/* Register frontend tools for DUMB widgets only (agent: null) */}
      {uniqueEntries
        .filter((e) => e.config.agent === null)
        .map((entry) => (
          <WidgetToolRegistrar
            key={entry.config.id}
            entry={entry}
            setSpawned={setSpawned}
          />
        ))}

      {/* Render spawned widgets */}
      <div className="grid grid-cols-4 gap-4 h-full auto-rows-min">
        {spawned.length === 0 && (
          <div className="col-span-4 flex items-center justify-center text-muted-foreground h-full">
            <p>Chat with the agent to get started</p>
          </div>
        )}

        {spawned.map(({ id, Component, props }) => {
          const entry = widgetEntries.find((e) => e.config.id === id);
          return (
            <div key={id} className={layoutClasses(entry?.config.layout)}>
              <WidgetShell label={id}>
                <Suspense fallback={<div className="animate-pulse h-32 bg-muted rounded" />}>
                  <Component {...props} widgetId={id} />
                </Suspense>
              </WidgetShell>
            </div>
          );
        })}
      </div>
    </div>
  );
}