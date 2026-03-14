"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CourseFormat } from "@/lib/types/course-builder";

interface SaveDraftButtonProps {
  conversationId: string | null;
  title: string;
  format: CourseFormat;
  files: Record<string, string>;
  onSaveSuccess?: (courseId: string) => void;
}

type SaveState = "idle" | "loading" | "success" | "error";

export default function SaveDraftButton({
  conversationId,
  title,
  format,
  files,
  onSaveSuccess,
}: SaveDraftButtonProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDisabled = !title.trim() || Object.keys(files).length === 0;

  const handleSave = async () => {
    // Show validation message if disabled
    if (isDisabled) {
      setErrorMessage("请输入标题并生成课程内容");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setSaveState("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          format,
          files,
          conversationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "保存失败");
      }

      const data = await response.json();
      const courseId = data.id;

      // Success state
      setSaveState("success");

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("course-builder:course-created", {
          detail: { courseId },
        })
      );

      // Call success callback
      if (onSaveSuccess) {
        onSaveSuccess(courseId);
      }

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveState("idle");
      }, 2000);
    } catch (error) {
      setSaveState("error");
      const message =
        error instanceof Error ? error.message : "保存课程时出错";
      setErrorMessage(message);

      // Clear error after 3 seconds
      setTimeout(() => {
        setSaveState("idle");
        setErrorMessage(null);
      }, 3000);
    }
  };

  return (
    <>
      {/* Top overlay for errors/validation */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-500">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-[13.5px] font-body text-red-700 font-medium">
                {errorMessage}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <button
        onClick={handleSave}
        disabled={saveState === "loading" || saveState === "success"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink/[0.08] hover:border-ink/[0.16] text-ink/60 hover:text-ink transition-all text-[13.5px] font-body font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saveState === "loading" && (
          <>
            <svg
              className="animate-spin"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            保存中...
          </>
        )}
        {saveState === "success" && (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            已保存
          </>
        )}
        {(saveState === "idle" || saveState === "error") && (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17 21v-8H7v8M7 3v5h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            保存课程
          </>
        )}
      </button>
    </>
  );
}
