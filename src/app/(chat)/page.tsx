export const dynamic = "force-dynamic";

import { WidgetPanel } from "@/components/WidgetPanel";
import { ChatSidebar } from "@/components/ChatSidebar";

export default function Page() {
  return (
    <div className="flex h-dvh">
      <main className="flex-1 overflow-auto p-4">
        <WidgetPanel />
      </main>
      <aside className="w-[380px] border-l flex flex-col">
        <ChatSidebar />
      </aside>
    </div>
  );
}
