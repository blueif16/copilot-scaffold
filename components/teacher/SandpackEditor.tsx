"use client";

import { useEffect } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react";
import SaveDraftButton from "@/components/teacher/SaveDraftButton";
import { CourseTemplate } from "@/lib/types/course-builder";

// Inject global Sandpack styles once
function ensureSandpackStyles() {
  if (document.getElementById("sandpack-global-styles")) return;
  const style = document.createElement("style");
  style.id = "sandpack-global-styles";
  style.textContent = `
    .sandpack-fill {
      height: 100% !important;
      width: 100% !important;
    }
    /* Make SandpackLayout fill its parent */
    .sandpack-fill > div {
      height: 100% !important;
    }
    /* Fix code editor height to show all content */
    .sp-code-editor {
      height: 100% !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .sp-code-editor .cm-editor {
      height: 100% !important;
      flex: 1 !important;
      min-height: 0 !important;
    }
    .sp-code-editor .cm-scroller {
      overflow: auto !important;
      height: 100% !important;
      max-height: 100% !important;
    }
    .sp-code-editor .cm-content {
      min-height: auto !important;
      height: auto !important;
    }
    /* Ensure tabs container doesn't overflow */
    .sp-tabs {
      overflow-x: auto !important;
      flex-shrink: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

export function SandpackEditor({
  files,
  previewMode,
  onPreviewModeChange,
  onClose,
  selectedTemplate,
}: {
  files: Record<string, string>;
  previewMode: "preview" | "code";
  onPreviewModeChange: (mode: "preview" | "code") => void;
  onClose: () => void;
  selectedTemplate: CourseTemplate | null;
}) {
  const fileKeys = Object.keys(files);
  const hasFiles = fileKeys.length > 0;

  const sandpackKey = fileKeys
    .sort()
    .map((k) => `${k}:${files[k].length}`)
    .join("|");

  // Inject global styles once
  useEffect(() => { ensureSandpackStyles(); }, []);

  useEffect(() => {
    console.log("[SandpackEditor] files:", fileKeys, "key:", sandpackKey);
  }, [sandpackKey]);

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
            title={selectedTemplate?.name || "新课程"}
            description={selectedTemplate?.description}
            format={selectedTemplate?.format || "lab"}
            files={files}
          />
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-ink/30 hover:text-ink/60 hover:bg-ink/[0.05] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
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
              {previewMode === "preview" ? (
                <SandpackPreview
                  showOpenInCodeSandbox={false}
                  showRefreshButton
                />
              ) : (
                <SandpackCodeEditor
                  showTabs
                  showLineNumbers
                  showInlineErrors
                  wrapContent
                  style={{ height: '100%' }}
                />
              )}
            </SandpackLayout>
          </SandpackProvider>
        )}
      </div>
    </div>
  );
}
