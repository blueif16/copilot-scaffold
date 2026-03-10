"use client";

import { useState } from "react";
import { CourseFormat } from "@/lib/types/course-builder";

interface SaveDraftButtonProps {
  title: string;
  description?: string;
  format: CourseFormat;
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
      // TODO: Implement save draft functionality
      // This component references a deleted action file
      setMessage("Save draft not yet implemented");
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
