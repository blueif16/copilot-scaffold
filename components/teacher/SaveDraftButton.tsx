"use client";

import { useState } from "react";
import { CourseFormat } from "@/lib/types/course-builder";
import StatusToast from "@/components/ui/StatusToast";

interface SaveDraftButtonProps {
  conversationId: string | null;
  title: string;
  format: CourseFormat;
  files: Record<string, string>;
  onCaptureScreenshot?: () => Promise<string | null>;
  onSaveSuccess?: (courseId: string) => void;
}

type SaveState = "idle" | "loading" | "success" | "error";

export default function SaveDraftButton({
  conversationId,
  title,
  format,
  files,
  onCaptureScreenshot,
  onSaveSuccess,
}: SaveDraftButtonProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("保存中...");

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
    setLoadingMessage("保存中...");

    try {
      let thumbnailUrl: string | undefined;

      // Step 1: Capture screenshot if callback provided
      if (onCaptureScreenshot) {
        try {
          setLoadingMessage("正在生成缩略图...");
          const dataUrl = await onCaptureScreenshot();

          if (dataUrl) {
            // Step 2: Upload screenshot to get public URL
            setLoadingMessage("正在上传缩略图...");
            const uploadResponse = await fetch("/api/courses/thumbnail", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ image: dataUrl }),
            });

            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json();
              thumbnailUrl = uploadData.url;
            } else {
              console.warn("[SaveDraftButton] Thumbnail upload failed:", await uploadResponse.text());
            }
          }
        } catch (error) {
          console.warn("[SaveDraftButton] Screenshot capture/upload failed:", error);
          // Continue with save even if thumbnail fails
        }
      }

      // Step 3: Save course with thumbnail URL
      setLoadingMessage("保存中...");
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
          thumbnail_url: thumbnailUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "保存失败");
      }

      const data = await response.json();
      const courseId = data.course?.id || data.id;

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
      <StatusToast
        show={!!errorMessage}
        message={errorMessage || ""}
        type="error"
      />

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
            {loadingMessage}
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
