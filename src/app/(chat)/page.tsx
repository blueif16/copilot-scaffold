"use client";

export const dynamic = "force-dynamic";

import { useState, useMemo, useEffect } from "react";
import { useAgent, useCopilotKit } from "@copilotkitnext/react";
import { randomUUID } from "@ag-ui/client";
import { Chat } from "@/components/chat";
import { WidgetPanel } from "@/components/WidgetPanel";
import { ChatSidebar } from "@/components/ChatSidebar";
import { WidgetToolRegistrar } from "@/components/WidgetToolRegistrar";
import { widgetEntries } from "@/lib/widgetEntries";
import type { SpawnedWidget } from "@/lib/types";

export type LayoutMode = "initial" | "chatting" | "with_canvas";

export default function Page() {
  const [spawned, setSpawned] = useState<SpawnedWidget[]>([]);
  const hasWidgets = spawned.length > 0;
  const { agent } = useAgent({ agentId: "orchestrator" });
  const { copilotkit } = useCopilotKit();

  useEffect(() => {
    const timer = setTimeout(() => {
      const tools = (copilotkit as any).runHandler?._tools ?? [];
      console.log(`[BOOT] firing auto-message, tools registered: ${tools.length} names: ${tools.map((t: any) => t.name).join(',')}`);
      agent.addMessage({ id: randomUUID(), role: "user", content: "hello" });
      copilotkit.runAgent({ agent });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

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
          />
        ))}

      {hasWidgets ? (
        <div className="flex h-dvh w-full">
          <aside className="w-[380px] shrink-0 border-r flex flex-col">
            <ChatSidebar
              layoutMode="with_canvas"
              onLayoutModeChange={() => {}}
            />
          </aside>
          <main className="flex-1 overflow-auto p-4">
            <WidgetPanel spawned={spawned} />
          </main>
        </div>
      ) : (
        <Chat onCanvasModeChange={() => {}} />
      )}
    </>
  );
}
