"use client";

import { AuthProvider } from "@/contexts/AuthContext";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
