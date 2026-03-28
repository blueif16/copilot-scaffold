"use client";

/**
 * PhotosynthesisQuiz — self-contained smart widget.
 *
 * Questions are baked into this file (the creative output from CourseBuilder).
 * Only tracked state (currentIndex, answers, results, phase, score) comes
 * from widget_state via the agent. The agent knows the answer key from prompt.md.
 *
 * Transform from CourseBuilder:
 *   /photosynthesis_quiz.jsx → this file (props wiring swapped to useAgent)
 */

import { useCallback, useEffect, useState } from "react";
import { useAgent as useV2Agent } from "@copilotkitnext/react";

// ── Questions (baked in from CourseBuilder data.json) ─────

const QUESTIONS = [
  {
    id: "q1",
    type: "multiple_choice",
    stem: "光合作用主要在植物细胞的哪个结构中进行？",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Plagiomnium_affine_laminazellen.jpeg/640px-Plagiomnium_affine_laminazellen.jpeg",
    options: [
      { key: "A", text: "线粒体" },
      { key: "B", text: "叶绿体" },
      { key: "C", text: "细胞核" },
      { key: "D", text: "内质网" },
    ],
    correctAnswer: "B",
    explanation: "叶绿体是光合作用的场所。它含有叶绿素，能够吸收光能并将二氧化碳和水转化为葡萄糖和氧气。",
  },
  {
    id: "q2",
    type: "multiple_choice",
    stem: "光合作用的原料是什么？",
    options: [
      { key: "A", text: "葡萄糖和氧气" },
      { key: "B", text: "二氧化碳和水" },
      { key: "C", text: "氧气和水" },
      { key: "D", text: "二氧化碳和葡萄糖" },
    ],
    correctAnswer: "B",
    explanation: "光合作用利用二氧化碳（CO₂）和水（H₂O）作为原料，在光能的驱动下合成有机物。",
  },
  {
    id: "q3",
    type: "multiple_choice",
    stem: "以下哪项不是光合作用的产物？",
    options: [
      { key: "A", text: "氧气" },
      { key: "B", text: "葡萄糖" },
      { key: "C", text: "二氧化碳" },
      { key: "D", text: "淀粉（葡萄糖储存形式）" },
    ],
    correctAnswer: "C",
    explanation: "二氧化碳是光合作用的原料，不是产物。",
  },
  {
    id: "q4",
    type: "multiple_choice",
    stem: "光合作用的化学方程式中，光能的作用是什么？",
    options: [
      { key: "A", text: "分解葡萄糖" },
      { key: "B", text: "驱动二氧化碳和水合成葡萄糖" },
      { key: "C", text: "产生热量" },
      { key: "D", text: "分解氧气" },
    ],
    correctAnswer: "B",
    explanation: "光能驱动二氧化碳和水合成葡萄糖和氧气。没有光能，这个反应无法自发进行。",
  },
  {
    id: "q5",
    type: "multiple_choice",
    stem: "如果把一盆绿色植物放在完全黑暗的环境中，会发生什么？",
    options: [
      { key: "A", text: "光合作用加速" },
      { key: "B", text: "光合作用停止，只进行呼吸作用" },
      { key: "C", text: "植物立即死亡" },
      { key: "D", text: "植物开始产生更多氧气" },
    ],
    correctAnswer: "B",
    explanation: "没有光照，光合作用无法进行。但植物仍然会进行呼吸作用消耗有机物。",
  },
];

const TOTAL = QUESTIONS.length;

// ── State wiring (widget protocol) ───────────────────────

export default function PhotosynthesisQuiz() {
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

  // ── Local UI state ─────────────────────────────────────

  const [showExplanation, setShowExplanation] = useState(false);
  const [direction, setDirection] = useState(0);

  useEffect(() => { setShowExplanation(false); }, [currentIndex]);

  const q = QUESTIONS[currentIndex];
  const myAnswer = answers[String(currentIndex)];
  const myResult = results[String(currentIndex)];
  const answered = myAnswer !== undefined;
  const pctDone = (Object.keys(results).length / TOTAL) * 100;

  // ── Handlers ───────────────────────────────────────────

  const pickAnswer = (key: string) => {
    if (answered || phase !== "in_progress" || !q) return;
    const correct = key === q.correctAnswer;
    updateState({
      answers: { ...answers, [String(currentIndex)]: key },
      results: { ...results, [String(currentIndex)]: correct ? "correct" : "wrong" },
      score: correct ? score + 1 : score,
    });
    setTimeout(() => setShowExplanation(true), 350);
  };

  const goTo = (i: number) => { setDirection(i > currentIndex ? 1 : -1); updateState({ currentIndex: i }); };
  const next = () => currentIndex < TOTAL - 1 ? goTo(currentIndex + 1) : updateState({ phase: "review" });
  const prev = () => currentIndex > 0 && goTo(currentIndex - 1);
  const doRestart = () => updateState({ currentIndex: 0, answers: {}, results: {}, score: 0, phase: "in_progress" });

  // ── Styles ─────────────────────────────────────────────

  const FONT = "'Noto Sans SC', 'Inter', system-ui, sans-serif";
  const BG = "#FAFAF7";
  const INK = "#1A1A1A";
  const GREEN = "#16a34a";
  const RED = "#dc2626";
  const BLUE = "#3B6AE6";

  // ── Review ─────────────────────────────────────────────

  if (phase === "review" || phase === "complete") {
    const pct = Math.round((score / TOTAL) * 100);
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: FONT, background: BG, color: INK, overflowY: "auto" }}>
        <div style={{ textAlign: "center", padding: "48px 24px 32px" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>测验完成</h2>
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.45)", margin: "0 0 24px" }}>
            {Object.keys(results).length} / {TOTAL} 题已作答
          </p>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 56, fontWeight: 800 }}>{score}</span>
            <span style={{ fontSize: 22, color: "rgba(0,0,0,0.3)" }}>/ {TOTAL}</span>
          </div>
          <div style={{ width: 200, height: 8, borderRadius: 4, background: "rgba(0,0,0,0.06)", margin: "20px auto 8px", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, width: pct + "%", background: pct >= 80 ? GREEN : pct >= 50 ? "#d97706" : RED, transition: "width 0.8s" }} />
          </div>
          <span style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>{pct}% 正确率</span>
        </div>

        <div style={{ flex: 1, padding: "0 20px 24px", maxWidth: 520, margin: "0 auto", width: "100%" }}>
          {QUESTIONS.map((item, idx) => {
            const a = answers[String(idx)]; const r = results[String(idx)]; const ok = r === "correct";
            return (
              <button key={item.id} onClick={() => updateState({ currentIndex: idx, phase: "in_progress" })}
                style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left", padding: "14px 16px", marginBottom: 10, borderRadius: 14, border: "1.5px solid " + (ok ? "rgba(22,163,74,0.25)" : a ? "rgba(220,38,38,0.2)" : "rgba(0,0,0,0.07)"), background: ok ? "rgba(22,163,74,0.03)" : a ? "rgba(220,38,38,0.02)" : "white", cursor: "pointer", fontFamily: FONT }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: ok ? "rgba(22,163,74,0.12)" : a ? "rgba(220,38,38,0.1)" : "rgba(0,0,0,0.05)", color: ok ? GREEN : a ? RED : "rgba(0,0,0,0.35)" }}>{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as any}>{item.stem}</p>
                  {a && <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", margin: "4px 0 0" }}>你的答案: {a}{!ok && " → 正确: " + item.correctAnswer}</p>}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "12px 20px 28px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <button onClick={doRestart} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: INK, color: "white", fontSize: 15, fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}>重新测验</button>
          </div>
        </div>
      </div>
    );
  }

  // ── In-progress ────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: FONT, background: BG, color: INK, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.45)" }}>{currentIndex + 1} / {TOTAL}</span>
          <span style={{ fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: score > 0 ? "rgba(22,163,74,0.08)" : "rgba(0,0,0,0.04)", color: score > 0 ? GREEN : "rgba(0,0,0,0.35)" }}>⭐ {score}</span>
        </div>
        <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, width: pctDone + "%", background: BLUE, transition: "width 0.4s" }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ padding: "8px 20px 20px", maxWidth: 560, margin: "0 auto" }}>
          {q?.image && (
            <div style={{ width: "100%", borderRadius: 16, overflow: "hidden", marginBottom: 20, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <img src={q.image} alt="" style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "cover", display: "block" }} />
            </div>
          )}

          {q && <h3 style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.6, margin: "12px 0 24px" }}>{q.stem}</h3>}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {q?.options?.map((opt) => {
              const isSel = myAnswer === opt.key;
              const isCorr = q.correctAnswer === opt.key;
              let border = "rgba(0,0,0,0.08)", bg = "white", fg = INK, indBg = "rgba(0,0,0,0.04)", indFg = "rgba(0,0,0,0.4)", indTxt: string = opt.key;
              if (answered) {
                if (isCorr) { border = "rgba(22,163,74,0.4)"; bg = "rgba(22,163,74,0.04)"; indBg = "rgba(22,163,74,0.15)"; indFg = GREEN; indTxt = "✓"; }
                else if (isSel) { border = "rgba(220,38,38,0.35)"; bg = "rgba(220,38,38,0.03)"; indBg = "rgba(220,38,38,0.12)"; indFg = RED; indTxt = "✗"; fg = "rgba(0,0,0,0.45)"; }
                else { border = "rgba(0,0,0,0.04)"; fg = "rgba(0,0,0,0.3)"; }
              }
              return (
                <button key={opt.key} onClick={() => pickAnswer(opt.key)} disabled={answered}
                  style={{ display: "flex", alignItems: "flex-start", gap: 14, width: "100%", textAlign: "left", padding: "16px 18px", borderRadius: 16, border: "2px solid " + border, background: bg, color: fg, fontSize: 15, fontWeight: 500, lineHeight: 1.55, fontFamily: FONT, cursor: answered ? "default" : "pointer", boxShadow: answered ? "none" : "0 1px 3px rgba(0,0,0,0.04)", minHeight: 56, transition: "all 0.2s" }}>
                  <span style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: answered && (isCorr || isSel) ? 16 : 14, fontWeight: 700, flexShrink: 0, background: indBg, color: indFg }}>{indTxt}</span>
                  <span style={{ paddingTop: 4 }}>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {answered && showExplanation && q?.explanation && (
            <div style={{ marginTop: 20, padding: "16px 18px", borderRadius: 14, border: "1.5px solid " + (myResult === "correct" ? "rgba(22,163,74,0.2)" : "rgba(217,119,6,0.2)"), background: myResult === "correct" ? "rgba(22,163,74,0.03)" : "rgba(217,119,6,0.03)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px", color: myResult === "correct" ? GREEN : "#d97706", opacity: 0.7 }}>
                {myResult === "correct" ? "✓ 正确" : "解析"}
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0, color: "rgba(0,0,0,0.7)" }}>{q.explanation}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: "12px 20px 24px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "white" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={prev} disabled={currentIndex === 0}
            style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "transparent", fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: currentIndex === 0 ? "not-allowed" : "pointer", color: currentIndex === 0 ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.5)" }}>
            ← 上一题
          </button>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {QUESTIONS.map((_, i) => {
              const r = results[String(i)]; const cur = i === currentIndex;
              return <button key={i} onClick={() => goTo(i)} style={{ width: cur ? 20 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer", padding: 0, background: cur ? BLUE : r === "correct" ? GREEN : r === "wrong" ? RED : "rgba(0,0,0,0.1)", transition: "all 0.2s" }} />;
            })}
          </div>
          <button onClick={next} disabled={!answered}
            style={{ padding: "10px 18px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: !answered ? "not-allowed" : "pointer", background: !answered ? "rgba(0,0,0,0.04)" : INK, color: !answered ? "rgba(0,0,0,0.15)" : "white", transition: "all 0.2s" }}>
            {currentIndex === TOTAL - 1 ? "查看结果 →" : "下一题 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
