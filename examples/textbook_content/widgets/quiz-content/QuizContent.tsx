"use client";

/**
 * QuizContent — Smart widget (final protocol form).
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TRANSFORM NOTE                                                │
 * │                                                                │
 * │  The ONLY difference between this file and the CourseBuilder   │
 * │  Simulation.js is the STATE WIRING section below (~20 lines).  │
 * │                                                                │
 * │  Simulation.js version:                                        │
 * │    export default function Simulation({ state, onStateChange, onEvent }) { │
 * │      const qs = state.questions ?? [];                         │
 * │      // ... same rendering code ...                            │
 * │    }                                                           │
 * │                                                                │
 * │  Widget version (this file):                                   │
 * │    Uses useAgent hook → reads agent.state.widget_state         │
 * │    Uses updateState(patch) → agent.setState + POST persist     │
 * │                                                                │
 * │  Everything below the "RENDERING" marker follows the same      │
 * │  logic and state shape. Styling differs (Tailwind vs inline). │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgent as useV2Agent } from "@copilotkitnext/react";

// ════════════════════════════════════════════════════════════
// STATE WIRING — Widget protocol (swap this block for transform)
// ════════════════════════════════════════════════════════════

interface QuizContentProps {
  widgetId?: string;
}

interface Question {
  id: string;
  type?: string;
  stem: string;
  image?: string | null;
  options: { key: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

interface QuizState {
  questions: Question[];
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, string>;
  results: Record<string, string>; // "correct" | "wrong"
  phase: "in_progress" | "review" | "complete";
  score: number;
}

const EMPTY_STATE: QuizState = {
  questions: [],
  totalQuestions: 0,
  currentIndex: 0,
  answers: {},
  results: {},
  phase: "in_progress",
  score: 0,
};

export default function QuizContent({ widgetId }: QuizContentProps) {
  const { agent } = useV2Agent({ agentId: "orchestrator" });
  const ws: QuizState = {
    ...EMPTY_STATE,
    ...((agent.state as any)?.widget_state ?? {}),
  };

  const updateState = useCallback(
    (patch: Partial<QuizState>) => {
      const current = (agent.state as any) ?? {};
      const currentWs = current.widget_state ?? {};
      agent.setState({
        ...current,
        widget_state: { ...currentWs, ...patch },
      });
      fetch("/api/widget-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: agent.threadId, patch }),
      }).catch(() => {});
    },
    [agent],
  );

  // ════════════════════════════════════════════════════════════
  // RENDERING — Everything below is identical to Simulation.js
  // ════════════════════════════════════════════════════════════

  const {
    questions,
    totalQuestions,
    currentIndex,
    answers,
    results,
    phase,
    score,
  } = ws;

  // Local UI state (not persisted to agent — animation/transition only)
  const [showExplanation, setShowExplanation] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);

  // Reset local UI state when question changes
  useEffect(() => {
    setShowExplanation(false);
  }, [currentIndex]);

  const currentQuestion: Question | undefined = questions[currentIndex];
  const currentAnswer = answers[String(currentIndex)];
  const currentResult = results[String(currentIndex)];
  const isAnswered = currentAnswer !== undefined;
  const progressPct =
    totalQuestions > 0
      ? (Object.keys(results).length / totalQuestions) * 100
      : 0;

  // ── Handlers ───────────────────────────────────────────

  const handleSelectOption = (optionKey: string) => {
    if (isAnswered || phase !== "in_progress") return;

    const q = currentQuestion;
    if (!q) return;

    const isCorrect = optionKey === q.correctAnswer;
    const newAnswers = { ...answers, [String(currentIndex)]: optionKey };
    const newResults = {
      ...results,
      [String(currentIndex)]: isCorrect ? "correct" : "wrong",
    };
    const newScore = isCorrect ? score + 1 : score;

    updateState({
      answers: newAnswers,
      results: newResults,
      score: newScore,
    });

    // Auto-show explanation after answering
    setTimeout(() => setShowExplanation(true), 400);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        updateState({ currentIndex: currentIndex + 1 });
        setIsTransitioning(false);
      }, 150);
    } else {
      // Last question answered — go to review
      updateState({ phase: "review" });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        updateState({ currentIndex: currentIndex - 1 });
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handleGoToQuestion = (idx: number) => {
    updateState({ currentIndex: idx, phase: "in_progress" });
  };

  const handleRestart = () => {
    updateState({
      currentIndex: 0,
      answers: {},
      results: {},
      score: 0,
      phase: "in_progress",
    });
  };

  // ── Option styling helpers ─────────────────────────────

  const getOptionClasses = (optionKey: string): string => {
    const base =
      "w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200 font-medium text-[15px] leading-relaxed";

    if (!isAnswered) {
      return `${base} border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] text-white/80 hover:text-white cursor-pointer active:scale-[0.98]`;
    }

    const isSelected = currentAnswer === optionKey;
    const isCorrectOption = currentQuestion?.correctAnswer === optionKey;

    if (isCorrectOption) {
      return `${base} border-emerald-400/60 bg-emerald-400/10 text-emerald-300`;
    }
    if (isSelected && !isCorrectOption) {
      return `${base} border-red-400/50 bg-red-400/10 text-red-300`;
    }
    return `${base} border-white/[0.05] bg-white/[0.01] text-white/30`;
  };

  const getOptionIndicator = (optionKey: string): React.ReactNode => {
    if (!isAnswered) {
      return (
        <span className="w-7 h-7 rounded-lg border border-white/15 flex items-center justify-center text-[13px] text-white/40 flex-shrink-0">
          {optionKey}
        </span>
      );
    }

    const isCorrectOption = currentQuestion?.correctAnswer === optionKey;
    const isSelected = currentAnswer === optionKey;

    if (isCorrectOption) {
      return (
        <span className="w-7 h-7 rounded-lg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#6ee7b7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      );
    }
    if (isSelected && !isCorrectOption) {
      return (
        <span className="w-7 h-7 rounded-lg bg-red-400/20 border border-red-400/40 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="#f87171"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[13px] text-white/20 flex-shrink-0">
        {optionKey}
      </span>
    );
  };

  // ── Empty / loading state ──────────────────────────────

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 text-white/40">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          className="mb-4 opacity-30"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M9 9h6M9 13h6M9 17h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm">等待题目加载…</p>
      </div>
    );
  }

  // ── Review screen ──────────────────────────────────────

  if (phase === "review" || phase === "complete") {
    const answeredCount = Object.keys(results).length;
    const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪";

    return (
      <div className="flex flex-col h-full bg-gray-950 text-white overflow-y-auto">
        {/* Score header */}
        <div className="flex flex-col items-center pt-12 pb-8 px-6">
          <span className="text-5xl mb-4">{emoji}</span>
          <h2 className="text-2xl font-bold mb-1">测验完成</h2>
          <p className="text-white/50 text-sm mb-6">
            {answeredCount} / {totalQuestions} 题已作答
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold tabular-nums">{score}</span>
            <span className="text-xl text-white/40">/ {totalQuestions}</span>
          </div>
          <div className="w-48 h-2 rounded-full bg-white/10 mt-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background:
                  pct >= 80
                    ? "linear-gradient(90deg, #34d399, #6ee7b7)"
                    : pct >= 50
                      ? "linear-gradient(90deg, #fbbf24, #fcd34d)"
                      : "linear-gradient(90deg, #f87171, #fca5a5)",
              }}
            />
          </div>
          <span className="text-sm text-white/40 mt-2">{pct}% 正确率</span>
        </div>

        {/* Question review list */}
        <div className="flex-1 px-6 pb-6">
          <div className="max-w-lg mx-auto space-y-3">
            {questions.map((q: Question, idx: number) => {
              const ans = answers[String(idx)];
              const res = results[String(idx)];
              const isCorrect = res === "correct";
              return (
                <button
                  key={q.id}
                  onClick={() => handleGoToQuestion(idx)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all hover:scale-[1.01] ${
                    isCorrect
                      ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                      : ans
                        ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isCorrect
                          ? "bg-emerald-400/20 text-emerald-400"
                          : ans
                            ? "bg-red-400/20 text-red-400"
                            : "bg-white/10 text-white/30"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 line-clamp-2">
                        {q.stem}
                      </p>
                      {ans && (
                        <p className="text-xs text-white/40 mt-1">
                          你的答案: {ans}
                          {!isCorrect && ` → 正确答案: ${q.correctAnswer}`}
                        </p>
                      )}
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-white/20 mt-1 flex-shrink-0"
                    >
                      <path
                        d="M9 18l6-6-6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 pb-6 pt-2 border-t border-white/[0.06]">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleRestart}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors"
            >
              重新测验
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── In-progress: question view ─────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header: progress + score */}
      <div className="shrink-0 px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-white/50">
            {currentIndex + 1} / {totalQuestions}
          </span>
          <span className="text-xs font-medium text-white/50">
            得分 {score}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-400/70 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div
          ref={questionRef}
          className={`max-w-lg mx-auto transition-all duration-150 ${
            isTransitioning
              ? "opacity-0 translate-x-4"
              : "opacity-100 translate-x-0"
          }`}
        >
          {/* Hero image (if question has one) */}
          {currentQuestion?.image && (
            <div className="mt-4 mb-4 rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03]">
              <img
                src={currentQuestion.image}
                alt=""
                className="w-full h-auto max-h-[220px] object-cover block"
              />
            </div>
          )}

          {/* Question stem */}
          <div className="mt-6 mb-8">
            <h3 className="text-lg font-semibold leading-relaxed text-white/90">
              {currentQuestion?.stem}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion?.options.map(
              (opt: { key: string; text: string }) => (
                <button
                  key={opt.key}
                  onClick={() => handleSelectOption(opt.key)}
                  disabled={isAnswered}
                  className={getOptionClasses(opt.key)}
                >
                  <div className="flex items-start gap-3">
                    {getOptionIndicator(opt.key)}
                    <span className="pt-0.5">{opt.text}</span>
                  </div>
                </button>
              ),
            )}
          </div>

          {/* Explanation (shows after answering) */}
          {isAnswered && showExplanation && currentQuestion?.explanation && (
            <div
              className={`mt-6 px-4 py-3.5 rounded-xl border text-sm leading-relaxed ${
                currentResult === "correct"
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200/80"
                  : "border-amber-500/20 bg-amber-500/5 text-amber-200/80"
              }`}
            >
              <p className="font-medium text-xs uppercase tracking-wide mb-1.5 opacity-60">
                {currentResult === "correct" ? "✓ 正确" : "✗ 解析"}
              </p>
              <p>{currentQuestion.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation footer */}
      <div className="shrink-0 px-5 pb-5 pt-2 border-t border-white/[0.06]">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentIndex === 0
                ? "text-white/15 cursor-not-allowed"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            ← 上一题
          </button>

          {/* Dot indicators */}
          <div className="flex gap-1.5">
            {questions.map((_: Question, idx: number) => {
              const res = results[String(idx)];
              const isCurrent = idx === currentIndex;
              let dotClass = "w-2 h-2 rounded-full transition-all duration-200 ";
              if (isCurrent) {
                dotClass += "w-5 bg-blue-400";
              } else if (res === "correct") {
                dotClass += "bg-emerald-400/60";
              } else if (res === "wrong") {
                dotClass += "bg-red-400/60";
              } else {
                dotClass += "bg-white/15";
              }
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      updateState({ currentIndex: idx });
                      setIsTransitioning(false);
                    }, 150);
                  }}
                  className={dotClass}
                  aria-label={`Go to question ${idx + 1}`}
                />
              );
            })}
          </div>

          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              !isAnswered
                ? "text-white/15 cursor-not-allowed"
                : "bg-white/10 hover:bg-white/15 text-white"
            }`}
          >
            {currentIndex === totalQuestions - 1 ? "查看结果 →" : "下一题 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
