"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { Chat } from "@/components/chat";
import { WidgetPanel } from "@/components/WidgetPanel";
import { ChatSidebar } from "@/components/ChatSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export type LayoutMode = "initial" | "chatting" | "with_canvas";

export default function Page() {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("initial");

  return (
    <>
      {/* WidgetPanel always mounted so tools register before first message */}
      <div className={layoutMode === "with_canvas" ? undefined : "hidden"}>
        <SidebarProvider>
          <div className="flex h-dvh">
            <aside className="w-[380px] border-r flex flex-col" data-sidebar="sidebar">
              <ChatSidebar
                layoutMode={layoutMode}
                onLayoutModeChange={setLayoutMode}
              />
            </aside>
            <main className="flex-1 overflow-auto p-4">
              <WidgetPanel />
            </main>
          </div>
        </SidebarProvider>
      </div>

      {layoutMode !== "with_canvas" && <Chat onCanvasModeChange={setLayoutMode} />}
    </>
  );
}