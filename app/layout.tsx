import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Omniscience — Interactive Learning",
  description:
    "Companion-driven educational simulations where the simulation teaches and the companion guides.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${spaceGrotesk.variable}`}
    >
      <body className="min-h-screen bg-paper text-ink font-body antialiased">
        <GrainOverlay />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
