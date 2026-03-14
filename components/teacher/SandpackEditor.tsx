"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react";
import SaveDraftButton from "@/components/teacher/SaveDraftButton";
import { CourseTemplate } from "@/lib/types/course-builder";
import { capturePreviewScreenshot } from "@/lib/utils/screenshot";

// Inject global Sandpack styles once
function ensureSandpackStyles() {
  if (document.getElementById("sandpack-global-styles")) return;
  const style = document.createElement("style");
  style.id = "sandpack-global-styles";
  style.textContent = `
    /* Make Sandpack fill its container */
    .sandpack-fill {
      height: 100% !important;
      width: 100% !important;
    }
    .sandpack-fill > div {
      height: 100% !important;
    }
    /* Stack layout: tabs at top, editor fills remaining space */
    .sp-layout {
      display: flex !important;
      flex-direction: column !important;
    }
    .sp-editor {
      display: flex !important;
      flex-direction: column !important;
      flex: 1 !important;
      min-height: 0 !important;
    }
    /* Tabs bar: horizontal scroll, fixed height */
    .sp-tabs {
      flex-shrink: 0 !important;
      height: auto !important;
      max-height: 40px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
    }
    /* Code editor: flex to fill remaining space */
    .sp-code-editor {
      flex: 1 !important;
      min-height: 0 !important;
      height: auto !important;
    }
    .sp-code-editor .cm-editor {
      height: 100% !important;
      min-height: 0 !important;
    }
    .sp-code-editor .cm-scroller {
      overflow: auto !important;
    }
  `;
  document.head.appendChild(style);
}

export function SandpackEditor({
  files,
  previewMode,
  onPreviewModeChange,
  selectedTemplate,
  conversationId,
  conversationTitle,
  onCaptureScreenshot,
}: {
  files: Record<string, string>;
  previewMode: "preview" | "code";
  onPreviewModeChange: (mode: "preview" | "code") => void;
  selectedTemplate: CourseTemplate | null;
  conversationId: string | null;
  conversationTitle: string;
  onCaptureScreenshot?: () => Promise<string | null>;
}) {
  const fileKeys = Object.keys(files);
  const hasFiles = fileKeys.length > 0;

  const sandpackKey = fileKeys
    .sort()
    .map((k) => `${k}:${files[k].length}`)
    .join("|");

  // Ref to the preview container for screenshot capture
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Inject global styles once
  useEffect(() => { ensureSandpackStyles(); }, []);

  // Screenshot capture callback
  const handleCaptureScreenshot = useCallback(async (): Promise<string | null> => {
    if (!previewContainerRef.current) {
      console.warn("[SandpackEditor] Preview container ref not available");
      return null;
    }

    try {
      const dataUrl = await capturePreviewScreenshot(previewContainerRef.current);
      return dataUrl;
    } catch (error) {
      console.error("[SandpackEditor] Screenshot capture failed:", error);
      return null;
    }
  }, []);


  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 h-10 flex items-center justify-between pl-1 pr-2 border-b border-ink/[0.06] bg-white">
        <div className="flex items-center">
          <button
            onClick={() => onPreviewModeChange("preview")}
            className={`px-3.5 py-1.5 text-[12.5px] font-body font-medium rounded-md transition-colors ${
              previewMode === "preview" ? "text-ink bg-ink/[0.06]" : "text-ink/40 hover:text-ink/60"
            }`}
          >
            预览
          </button>
          <button
            onClick={() => onPreviewModeChange("code")}
            className={`px-3.5 py-1.5 text-[12.5px] font-body font-medium rounded-md transition-colors ${
              previewMode === "code" ? "text-ink bg-ink/[0.06]" : "text-ink/40 hover:text-ink/60"
            }`}
          >
            代码
          </button>
        </div>
        <div className="flex items-center gap-1">
          <SaveDraftButton
            conversationId={conversationId}
            title={conversationTitle}
            format={selectedTemplate?.format || "lab"}
            files={files}
            onCaptureScreenshot={handleCaptureScreenshot}
            onSaveSuccess={(courseId) => {
              window.dispatchEvent(
                new CustomEvent("course-builder:course-created", {
                  detail: { id: courseId }
                })
              );
            }}
          />
        </div>
      </div>

      {/* Sandpack — fills all remaining height via flex-1 + min-h-0 */}
      <div className="flex-1 min-h-0">
        {!hasFiles ? (
          <div className="flex items-center justify-center h-full text-ink/20 font-body text-sm">
            代码生成后预览将在这里显示...
          </div>
        ) : (
          <SandpackProvider
            key={sandpackKey}
            template="react"
            files={files}
            theme="light"
            customSetup={{
              dependencies: { "framer-motion": "^11.0.0" },
            }}
            options={{
              activeFile: files["/App.js"] ? "/App.js" : fileKeys[0],
              classes: {
                "sp-wrapper": "sandpack-fill",
                "sp-layout": "sandpack-fill",
                "sp-stack": "sandpack-fill",
              },
            }}
          >
            <SandpackLayout>
              {/* Always render both to preserve state - toggle visibility with CSS */}
              <div
                ref={previewContainerRef}
                className={previewMode === "preview" ? "block" : "hidden"}
              >
                <SandpackPreview
                  showOpenInCodeSandbox={false}
                  showRefreshButton
                />
              </div>
              <div className={previewMode === "code" ? "block" : "hidden"}>
                <SandpackCodeEditor
                  showTabs
                  showLineNumbers
                  showInlineErrors
                  wrapContent
                />
              </div>
            </SandpackLayout>
          </SandpackProvider>
        )}
      </div>
    </div>
  );
}
