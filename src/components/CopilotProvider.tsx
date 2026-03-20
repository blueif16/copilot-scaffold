"use client";

import { CopilotKitProvider } from "@copilotkitnext/react";
import "@copilotkit/react-ui/styles.css";
import { ReactNode } from "react";

export function CopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKitProvider
      runtimeUrl="/api/copilotkit"
      {...({ agent: "orchestrator" } as any)}
      showDevConsole={false}
    >
      {children}
    </CopilotKitProvider>
  );
}
