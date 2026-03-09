// ═══════════════════════════════════════════════════════════
// Course Builder — Minimal Sandpack starter scaffolds
//
// These are NOT working demos. They are bare structural
// skeletons that establish the format's layout pattern.
// The agent generates all actual content from scratch.
// ═══════════════════════════════════════════════════════════

import type { CourseFormat } from "@/lib/types/course-builder";

export function getTemplateFiles(format: CourseFormat): Record<string, string> {
  switch (format) {
    case "lab":
      return { "/App.js": LAB_SCAFFOLD };
    case "quiz":
      return { "/App.js": QUIZ_SCAFFOLD };
    case "dialogue":
      return { "/App.js": DIALOGUE_SCAFFOLD };
    default:
      return { "/App.js": LAB_SCAFFOLD };
  }
}

// ── Lab Scaffold ────────────────────────────────────────
// Layout: header + visualization area + control panel
// Agent fills in: what's visualized, what controls exist,
// how they interact, colors, animations, everything.

const LAB_SCAFFOLD = `import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// TODO: Agent replaces this entire file with the actual experiment.
// This scaffold shows the expected layout structure only.

export default function App() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "'Noto Sans SC', system-ui, sans-serif",
      background: "#FAFAF7", color: "#1A1A1A",
      userSelect: "none", overflow: "hidden",
    }}>
      {/* 顶部标题栏 */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>实验标题</div>
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginTop: 2 }}>实验描述</div>
      </div>

      {/* 可视化区域（占大部分空间） */}
      <div style={{
        flex: 1, padding: 16, minHeight: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ color: "rgba(0,0,0,0.2)", fontSize: 14 }}>
          可视化内容由 AI 生成...
        </div>
      </div>

      {/* 控制面板 */}
      <div style={{
        padding: "16px 20px 24px",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        background: "white",
      }}>
        <div style={{ color: "rgba(0,0,0,0.2)", fontSize: 13, textAlign: "center" }}>
          控制面板由 AI 生成...
        </div>
      </div>
    </div>
  );
}
`;

// ── Quiz Scaffold ───────────────────────────────────────
// Layout: header + progress + question area + bottom nav
// Agent fills in: questions, options, scoring, feedback, everything.

const QUIZ_SCAFFOLD = `import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// TODO: Agent replaces this entire file with the actual quiz.
// This scaffold shows the expected layout structure only.

export default function App() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "'Noto Sans SC', system-ui, sans-serif",
      background: "#FAFAF7", color: "#1A1A1A", overflow: "hidden",
    }}>
      {/* 顶部栏：题号 + 得分 */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>第 1 题 / 共 ? 题</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>得分：0 ⭐</div>
      </div>

      {/* 进度条 */}
      <div style={{ height: 4, background: "rgba(0,0,0,0.04)" }} />

      {/* 题目 + 选项区域 */}
      <div style={{
        flex: 1, padding: "28px 20px", overflow: "auto",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ color: "rgba(0,0,0,0.2)", fontSize: 14 }}>
          题目内容由 AI 生成...
        </div>
      </div>

      {/* 底部导航按钮 */}
      <div style={{
        padding: "12px 20px 24px",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        background: "white",
      }}>
        <div style={{ color: "rgba(0,0,0,0.2)", fontSize: 13, textAlign: "center" }}>
          导航按钮由 AI 生成...
        </div>
      </div>
    </div>
  );
}
`;

// ── Dialogue Scaffold ───────────────────────────────────
// Layout: header + progress + dialogue area + choice buttons
// Agent fills in: characters, story, branches, everything.

const DIALOGUE_SCAFFOLD = `import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// TODO: Agent replaces this entire file with the actual dialogue.
// This scaffold shows the expected layout structure only.

export default function App() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "'Noto Sans SC', system-ui, sans-serif",
      background: "#FAFAF7", color: "#1A1A1A", overflow: "hidden",
    }}>
      {/* 顶部栏：标题 + 进度 */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>📖 故事标题</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>进度 0%</div>
      </div>

      {/* 进度条 */}
      <div style={{ height: 3, background: "rgba(0,0,0,0.04)" }} />

      {/* 对话区域 */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "20px 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ color: "rgba(0,0,0,0.2)", fontSize: 14 }}>
          对话内容由 AI 生成...
        </div>
      </div>

      {/* 选择按钮区域 */}
      <div style={{
        padding: "12px 16px 24px",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        background: "white",
      }}>
        <div style={{ color: "rgba(0,0,0,0.2)", fontSize: 13, textAlign: "center" }}>
          选择按钮由 AI 生成...
        </div>
      </div>
    </div>
  );
}
`;
