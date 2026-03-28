"use client";

/**
 * AncientHistoryQuiz — self-contained smart widget.
 *
 * Questions are baked into this file (the creative output from CourseBuilder).
 * Only tracked state (currentIndex, answers, results, phase, score) comes
 * from widget_state via the agent. The agent knows the answer key from prompt.md.
 *
 * Transform from CourseBuilder:
 *   /ancient_history_quiz.jsx -> this file (props wiring swapped to useAgent)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgent as useV2Agent } from "@copilotkitnext/react";
import { motion, AnimatePresence } from "framer-motion";

// ── Questions (baked in from CourseBuilder data.json) ─────

const QUESTIONS = [
  {
    "id": "q1",
    "type": "multiple_choice",
    "stem": "Which civilization is credited with inventing the first writing system?",
    "image": null,
    "options": [
      {
        "key": "A",
        "text": "Ancient Egypt"
      },
      {
        "key": "B",
        "text": "Ancient Greece"
      },
      {
        "key": "C",
        "text": "Mesopotamia (Sumer)"
      },
      {
        "key": "D",
        "text": "Ancient Rome"
      }
    ],
    "correctAnswer": "C",
    "explanation": "The Sumerians in Mesopotamia developed cuneiform around 3400 BCE, the earliest known writing system."
  },
  {
    "id": "q2",
    "type": "multiple_choice",
    "stem": "What was the primary purpose of the Egyptian pyramids?",
    "image": "https://example.com/pyramids.jpg",
    "options": [
      {
        "key": "A",
        "text": "Temples for worship"
      },
      {
        "key": "B",
        "text": "Tombs for pharaohs"
      },
      {
        "key": "C",
        "text": "Granaries for food storage"
      },
      {
        "key": "D",
        "text": "Astronomical observatories"
      }
    ],
    "correctAnswer": "B",
    "explanation": "The pyramids were monumental tombs built to house the remains of pharaohs and their treasures for the afterlife."
  },
  {
    "id": "q3",
    "type": "multiple_choice",
    "stem": "Which ancient city is considered the birthplace of democracy?",
    "options": [
      {
        "key": "A",
        "text": "Rome"
      },
      {
        "key": "B",
        "text": "Sparta"
      },
      {
        "key": "C",
        "text": "Athens"
      },
      {
        "key": "D",
        "text": "Babylon"
      }
    ],
    "correctAnswer": "C",
    "explanation": "Athens developed the first known democratic system around 508 BCE under the reforms of Cleisthenes."
  }
];

const TOTAL = QUESTIONS.length;

// ── State wiring (widget protocol) ───────────────────────

export default function AncientHistoryQuiz() {
  const { agent } = useV2Agent({ agentId: "orchestrator" });
  const ws = (agent.state as any)?.widget_state ?? {};

  // Tracked state from agent — questions are local, not from widget_state
  const currentIndex: number = ws.currentIndex ?? 0;
  const answers: Record<string, string> = ws.answers ?? {};
  const results: Record<string, string> = ws.results ?? {};
  const phase: string = ws.phase ?? "in_progress";
  const score: number = ws.score ?? 0;

  const updateState = useCallback((patch: Record<string, unknown>) => {
    const cur = (agent.state as any) ?? {};
    agent.setState({ ...cur, widget_state: { ...(cur.widget_state ?? {}), ...patch } });
    fetch("/api/widget-state", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id: agent.threadId, patch }),
    }).catch(() => {});
  }, [agent]);

  const [showFeedback, setShowFeedback] = useState(false);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    setShowFeedback(false);
  }, [currentIndex]);

  const q = QUESTIONS[currentIndex];
  const myAnswer = answers[String(currentIndex)];
  const myResult = results[String(currentIndex)];
  const answered = myAnswer !== undefined;
  const pctDone = TOTAL > 0 ? (Object.keys(results).length / TOTAL) * 100 : 0;

  const FONT = "'Noto Sans SC', system-ui, sans-serif";
  const BG = "#FAFAF7";
  const INK = "#1A1A1A";
  const GREEN = "#16a34a";
  const RED = "#dc2626";
  const BLUE = "#3B6AE6";

  const handleSelect = (key) => {
    if (answered || phase !== "in_progress") return;
    const correct = key === q.correctAnswer;
    updateState({
      answers: { ...answers, [String(currentIndex)]: key },
      results: { ...results, [String(currentIndex)]: correct ? "correct" : "wrong" },
      score: correct ? score + 1 : score,
    });    setTimeout(() => setShowFeedback(true), 300);
  };

  const goTo = (i) => {
    setDirection(i > currentIndex ? 1 : -1);
    updateState({ currentIndex: i });
  };

  const next = () => {
    if (currentIndex < TOTAL - 1) {
      goTo(currentIndex + 1);
    } else {
      updateState({ phase: "review" });    }
  };

  const prev = () => currentIndex > 0 && goTo(currentIndex - 1);

  const restart = () => {
    updateState({ currentIndex: 0, answers: {}, results: {}, score: 0, phase: "in_progress" });
  };

  if (phase === "review" || phase === "complete") {
    const pct = TOTAL > 0 ? Math.round((score / TOTAL) * 100) : 0;
    return (
      <div ref={containerRef} style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: FONT, background: BG, color: INK, overflowY: "auto" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", padding: "48px 24px 32px" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Quiz Complete</h2>
          <p>{score} / {TOTAL} correct ({pct}%)</p>
        </motion.div>
        <div style={{ padding: "0 20px 24px" }}>
          {QUESTIONS.map((item, idx) => (
            <div key={item.id} style={{ padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 14 }}>{idx + 1}. {item.stem}</p>
              <p style={{ fontSize: 12, color: results[String(idx)] === "correct" ? GREEN : RED }}>
                Your answer: {answers[String(idx)]} {results[String(idx)] === "correct" ? "✓" : "✗ → " + item.correctAnswer}
              </p>
            </div>
          ))}
        </div>
        <button onClick={restart} style={{ margin: "0 20px 24px", padding: "14px", borderRadius: 12, border: "none", background: INK, color: "white", fontFamily: FONT, cursor: "pointer" }}>
          Restart
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: FONT, background: BG, color: INK, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{currentIndex + 1} / {TOTAL}</span>
          <span>Score: {score}</span>
        </div>
        <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <motion.div animate={{ width: pctDone + "%" }} style={{ height: "100%", background: BLUE }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ x: direction > 0 ? 80 : -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -80 : 80, opacity: 0 }}
            style={{ padding: "8px 20px 20px" }}
          >
            {q && q.image && (
              <img src={q.image} alt="" style={{ width: "100%", borderRadius: 16, marginBottom: 16 }} />
            )}
            {q && <h3 style={{ fontSize: 19, fontWeight: 700, margin: "12px 0 24px" }}>{q.stem}</h3>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {q && q.options && q.options.map((opt) => {
                const isSel = myAnswer === opt.key;
                const isCorr = q.correctAnswer === opt.key;
                let bg = "white";
                if (answered && isCorr) bg = "rgba(22,163,74,0.04)";
                else if (answered && isSel) bg = "rgba(220,38,38,0.03)";
                return (
                  <motion.button
                    key={opt.key}
                    onClick={() => handleSelect(opt.key)}
                    disabled={answered}
                    whileHover={!answered ? { scale: 1.02 } : {}}
                    style={{ display: "flex", gap: 14, padding: "16px 18px", borderRadius: 16, border: "2px solid rgba(0,0,0,0.08)", background: bg, cursor: answered ? "default" : "pointer", fontFamily: FONT, fontSize: 15 }}
                  >
                    <span style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, background: "rgba(0,0,0,0.04)" }}>
                      {answered && isCorr ? "✓" : answered && isSel ? "✗" : opt.key}
                    </span>
                    <span style={{ paddingTop: 4 }}>{opt.text}</span>
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {showFeedback && answered && q && q.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: 20, padding: "16px 18px", borderRadius: 14, background: myResult === "correct" ? "rgba(22,163,74,0.03)" : "rgba(217,119,6,0.03)" }}
                >
                  <p style={{ fontSize: 14, color: "rgba(0,0,0,0.7)" }}>{q.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ padding: "12px 20px 24px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button onClick={prev} disabled={currentIndex === 0} style={{ padding: "10px 18px", border: "none", background: "transparent", fontFamily: FONT, cursor: currentIndex === 0 ? "not-allowed" : "pointer" }}>
            ← Prev
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            {QUESTIONS.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={{ width: i === currentIndex ? 20 : 8, height: 8, borderRadius: 4, border: "none", background: i === currentIndex ? BLUE : results[String(i)] === "correct" ? GREEN : results[String(i)] === "wrong" ? RED : "rgba(0,0,0,0.1)", cursor: "pointer", padding: 0 }} />
            ))}
          </div>
          <button onClick={next} disabled={!answered} style={{ padding: "10px 18px", border: "none", background: !answered ? "rgba(0,0,0,0.04)" : INK, color: !answered ? "rgba(0,0,0,0.15)" : "white", fontFamily: FONT, cursor: !answered ? "not-allowed" : "pointer" }}>
            {currentIndex === TOTAL - 1 ? "Results →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
