"use client";

import { Suspense } from "react";
import { WidgetShell } from "./widgets/shared/WidgetShell";
import { widgetEntries } from "@/lib/widgetEntries";
import type { SpawnedWidget } from "@/lib/types";
import type { WidgetLayout } from "@/types/state";

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

interface Props {
  spawned: SpawnedWidget[];
}

export function WidgetPanel({ spawned }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full auto-rows-min">
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
  );
}
