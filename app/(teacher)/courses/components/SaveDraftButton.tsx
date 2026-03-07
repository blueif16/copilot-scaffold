"use client";

import { useState } from "react";
import { saveDraft } from "../actions";

interface SaveDraftButtonProps {
  title: string;
  description?: string;
  format: "lab" | "quiz";
  files: Record<string, string>;
}

export default function SaveDraftButton({
  title,
  description,
  format,
  files,
}: SaveDraftButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Extract simulation JSX from files (typically /App.tsx or /App.jsx)
      const simulation_jsx = files["/App.jsx"] || files["/App.tsx"] || files["/index.tsx"] || "";

      // Extract interactions.json if it exists
      let interactions_json = null;
      const interactionsFile = files["/interactions.json"];
      if (interactionsFile) {
        try {
          interactions_json = JSON.parse(interactionsFile);
        } catch (parseError) {
          console.error("Failed to parse interactions.json:", parseError);
        }
      }

      const result = await saveDraft({
        title,
        description,
        format,
        simulation_jsx,
        interactions_json,
      });

      if (result.success) {
        setMessage("Draft saved successfully!");
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage("Failed to save draft");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSave}
        disabled={isLoading || !title.trim()}
        className="btn-chunky px-4 py-2 bg-sage text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : "Save Draft"}
      </button>
      {message && (
        <span
          className={`text-sm font-body ${
            message.includes("Error") ? "text-red-600" : "text-green-600"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
