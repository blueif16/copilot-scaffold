"use client";

import { CopilotKitProvider } from "@copilotkitnext/react";
import "@copilotkit/react-ui/styles.css";
import { ReactNode } from "react";

export function CopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKitProvider
      runtimeUrl="/api/copilotkit"
      agent="orchestrator"
      showDevConsole={false}
    >
      {children}
    </CopilotKitProvider>
  );
}
