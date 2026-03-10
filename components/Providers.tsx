"use client";

import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { AuthProvider } from "@/contexts/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GrainOverlay />
      <AuthProvider>
        <LocaleProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </LocaleProvider>
      </AuthProvider>
    </>
  );
}
