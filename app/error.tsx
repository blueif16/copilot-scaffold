"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-8">
      <div className="card-chunky max-w-md w-full p-8 text-center">
        <span className="text-5xl mb-4 block">🔧</span>
        <h2 className="font-display text-2xl font-bold mb-3">
          Something went wrong!
        </h2>
        <p className="font-body text-sm text-ink/60 mb-6 leading-relaxed">
          The science lab hit a snag. Let&apos;s try that again.
        </p>
        <button onClick={reset} className="btn-chunky bg-playful-mustard">
          Try Again
        </button>
      </div>
    </div>
  );
}
