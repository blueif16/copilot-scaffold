"use client";

export const dynamic = "force-dynamic";

import { useState, useMemo, useEffect, useRef } from "react";
import { useAgent } from "@copilotkitnext/react";
import { Chat } from "@/components/chat";
import { WidgetPanel } from "@/components/WidgetPanel";
import { ChatSidebar } from "@/components/ChatSidebar";
import { WidgetToolRegistrar } from "@/components/WidgetToolRegistrar";
import { widgetEntries } from "@/lib/widgetEntries";
import type { SpawnedWidget } from "@/lib/types";
import type { ActiveWidget } from "@/types/state";

export type LayoutMode = "initial" | "chatting" | "with_canvas";

export default function Page() {
  const [spawned, setSpawned] = useState<SpawnedWidget[]>([]);
  // IDs of dumb widgets rendered optimistically this turn.
  // We skip any backend snapshot that doesn't contain ALL of these IDs,
  // since intermediate snapshots reflect stale graph state (before _sync_dumb_widgets runs).
  // Cleared once backend confirms the expected IDs.
  const expectedDumbIds = useRef<Set<string>>(new Set());
  const hasWidgets = spawned.length > 0;
  const { agent } = useAgent({ agentId: "orchestrator" });

  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onStateChanged: ({ state: s }) => {
        const activeWidgets: ActiveWidget[] = (s as any).active_widgets ?? [];
        const widgetState: Record<string, any> = (s as any).widget_state ?? {};

        // Backend is the single source of truth for ALL widgets (smart + dumb).
        // _sync_dumb_widgets on the backend writes dumb widget calls into active_widgets.
        // However, the backend emits intermediate STATE_SNAPSHOT events before _sync_dumb_widgets
        // has updated active_widgets — these contain stale canvas state.
        //
        // While dumb widgets are in-flight, we skip snapshots that don't confirm the
        // expected widget IDs. Once confirmed, we clear the latch and trust backend fully.
        const nextSpawned = activeWidgets
          .map((aw) => {
            const entry = widgetEntries.find((e) => e.config.id === aw.id);
            if (!entry) return null;
            const props =
              aw.type === "smart"
                ? { ...aw.props, ...widgetState }
                : aw.props;
            return { id: aw.id, Component: entry.Component, props };
          })
          .filter(Boolean) as SpawnedWidget[];

        const backendIds = new Set(activeWidgets.map((w) => w.id));
        const pending = expectedDumbIds.current;
        if (pending.size > 0) {
          // We have optimistically-rendered dumb widgets in flight.
          // Only trust this snapshot once backend confirms all expected IDs.
          const allConfirmed = [...pending].every((id) => backendIds.has(id));
          if (!allConfirmed) return; // stale intermediate snapshot — skip
          expectedDumbIds.current = new Set(); // confirmed, clear latch
        }
        setSpawned(nextSpawned);
      },
    });
    return unsubscribe;
  }, [agent]);

  const uniqueEntries = useMemo(() => {
    const seen = new Set<string>();
    return widgetEntries.filter((entry) => {
      if (seen.has(entry.config.tool.name)) return false;
      seen.add(entry.config.tool.name);
      return true;
    });
  }, []);

  return (
    <>
      {/*
        Always-mounted tool registrars — render null, just run useFrontendTool.
        Must live at page root with no hidden/conditional parent so React
        never defers their effects before the first user message.
      */}
      {uniqueEntries
        .filter((e) => e.config.agent === null)
        .map((entry) => (
          <WidgetToolRegistrar
            key={entry.config.id}
            entry={entry}
            setSpawned={setSpawned}
            onOptimisticRender={(w) => {
              // Track this widget ID — skip backend snapshots until it's confirmed.
              expectedDumbIds.current = new Set([w.id]);
            }}
          />
        ))}

      {hasWidgets ? (
        <div className="flex h-dvh w-full">
          <aside className="w-[380px] shrink-0 border-r flex flex-col">
            <ChatSidebar agent={agent} />
          </aside>
          <main className="flex-1 overflow-auto p-4">
            <WidgetPanel spawned={spawned} />
          </main>
        </div>
      ) : (
        <Chat agent={agent} />
      )}
    </>
  );
}
