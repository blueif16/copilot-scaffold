"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LabNotebookPage } from "@/lib/types";

// ── Tint map ────────────────────────────────────────────

const TINT: Record<string, string> = {
  sky: "bg-playful-sky/15",
  peach: "bg-playful-peach/15",
  sage: "bg-playful-sage/15",
  lavender: "bg-playful-lavender/15",
  mustard: "bg-playful-mustard/15",
};

const TINT_ACCENT: Record<string, string> = {
  sky: "bg-playful-sky",
  peach: "bg-playful-peach",
  sage: "bg-playful-sage",
  lavender: "bg-playful-lavender",
  mustard: "bg-playful-mustard",
};

const TINT_BORDER: Record<string, string> = {
  sky: "border-playful-sky/40",
  peach: "border-playful-peach/40",
  sage: "border-playful-sage/40",
  lavender: "border-playful-lavender/40",
  mustard: "border-playful-mustard/40",
};

// ── Page turn animation variants ────────────────────────

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
    rotateY: direction > 0 ? 8 : -8,
  }),
  center: {
    x: 0,
    opacity: 1,
    rotateY: 0,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
    rotateY: direction > 0 ? -8 : 8,
  }),
};

// ── Visual page layout ──────────────────────────────────

function VisualPage({ page }: { page: LabNotebookPage }) {
  const tint = page.bgTint ? TINT[page.bgTint] : "bg-playful-sky/10";

  return (
    <div className={`flex flex-col h-full ${tint} rounded-xl p-5`}>
      {/* Illustration — centered in the middle */}
      {page.illustration && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <img
            src={page.illustration}
            alt=""
            className="max-h-full max-w-[75%] object-contain select-none drop-shadow-md"
          />
        </div>
      )}
      {page.caption && (
        <p className="text-center font-body text-xs text-ink/50 italic mb-2">
          {page.caption}
        </p>
      )}
      {/* Text at the bottom */}
      <div className="shrink-0 mt-auto">
        <p className="font-body text-base leading-relaxed text-ink/80">
          {page.body}
        </p>
      </div>
    </div>
  );
}

// ── Text-heavy page layout ──────────────────────────────

function TextPage({ page }: { page: LabNotebookPage }) {
  const tint = page.bgTint ? TINT[page.bgTint] : "bg-white";

  return (
    <div className={`flex flex-col h-full ${tint} rounded-xl p-5`}>
      {/* Illustration — centered in the middle */}
      {page.illustration && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <img
            src={page.illustration}
            alt=""
            className="max-h-[50%] max-w-[50%] object-contain select-none opacity-80 drop-shadow-sm"
          />
        </div>
      )}
      {/* Text at the bottom */}
      <div className="shrink-0 mt-auto">
        {page.body.split("\n").map((paragraph, i) => (
          <p
            key={i}
            className="font-body text-base leading-relaxed text-ink/80 mb-2 last:mb-0"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Fun fact page layout ────────────────────────────────

function FunFactPage({ page }: { page: LabNotebookPage }) {
  const tint = page.bgTint ? TINT[page.bgTint] : "bg-playful-mustard/15";
  const accentBorder = page.bgTint
    ? TINT_BORDER[page.bgTint]
    : "border-playful-mustard/40";

  return (
    <div className={`flex flex-col h-full ${tint} rounded-xl p-5`}>
      {/* Fun fact badge */}
      <div className="flex items-center gap-2 shrink-0">
        <img
          src="/assets/light_bulb.png"
          alt=""
          className="w-6 h-6 object-contain select-none"
        />
        <span className="font-display text-xs font-bold text-ink/60 uppercase tracking-wider">
          Fun Fact
        </span>
      </div>

      {/* Illustration — centered in the middle */}
      {page.illustration && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <img
            src={page.illustration}
            alt=""
            className="max-h-[50%] max-w-[50%] object-contain select-none drop-shadow-sm"
          />
        </div>
      )}
      {page.caption && (
        <p className="text-center font-body text-xs text-ink/50 italic mb-2">
          {page.caption}
        </p>
      )}

      {/* Text at the bottom */}
      <div
        className={`shrink-0 mt-auto border-2 ${accentBorder} bg-white/60 rounded-xl p-3`}
      >
        <p className="font-body text-base leading-relaxed text-ink/80">
          {page.body}
        </p>
      </div>
    </div>
  );
}

// ── Page renderer dispatcher ────────────────────────────

function NotebookPageContent({ page }: { page: LabNotebookPage }) {
  switch (page.variant) {
    case "visual":
      return <VisualPage page={page} />;
    case "fun-fact":
      return <FunFactPage page={page} />;
    case "text":
    default:
      return <TextPage page={page} />;
  }
}

// ── Main LabNotebook component ──────────────────────────

interface LabNotebookProps {
  pages: LabNotebookPage[];
  topicTitle: string;
  onAskAboutSelection?: (selectedText: string) => void;
}

export function LabNotebook({ pages, topicTitle, onAskAboutSelection }: LabNotebookProps) {
  const [[currentPage, direction], setPage] = useState([0, 0]);

  // ── Text selection state ─────────────────────────────
  const [selectionText, setSelectionText] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const notebookRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 2) {
      setSelectionText(null);
      setTooltipPos(null);
      return;
    }
    // Make sure selection is inside the notebook
    if (
      notebookRef.current &&
      selection?.rangeCount &&
      notebookRef.current.contains(selection.anchorNode)
    ) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const parentRect = notebookRef.current.getBoundingClientRect();
      setSelectionText(text);
      setTooltipPos({
        x: rect.left + rect.width / 2 - parentRect.left,
        y: rect.top - parentRect.top - 8,
      });
    }
  }, []);

  const handleAskClick = useCallback(() => {
    if (selectionText && onAskAboutSelection) {
      onAskAboutSelection(selectionText);
    }
    // Clear selection
    window.getSelection()?.removeAllRanges();
    setSelectionText(null);
    setTooltipPos(null);
  }, [selectionText, onAskAboutSelection]);

  // Dismiss tooltip when clicking outside or on page change
  useEffect(() => {
    setSelectionText(null);
    setTooltipPos(null);
  }, [currentPage]);

  const paginate = useCallback(
    (newDirection: number) => {
      setPage(([prev]) => {
        const next = prev + newDirection;
        if (next < 0 || next >= pages.length) return [prev, 0];
        return [next, newDirection];
      });
    },
    [pages.length],
  );

  const goToPage = useCallback((index: number) => {
    setPage(([prev]) => [index, index > prev ? 1 : -1]);
  }, []);

  const page = pages[currentPage];
  if (!page) return null;

  const accentColor = page.bgTint
    ? TINT_ACCENT[page.bgTint]
    : "bg-playful-sky";

  return (
    <div className="relative flex flex-col h-full" ref={notebookRef} onMouseUp={handleMouseUp}>
      {/* Yellow highlight style for selected text inside notebook */}
      <style>{`
        .notebook-selectable ::selection {
          background: #FEF3B0;
          color: inherit;
        }
      `}</style>

      {/* ── "Ask about it" floating tooltip ── */}
      <AnimatePresence>
        {selectionText && tooltipPos && onAskAboutSelection && (
          <motion.div
            key="ask-tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 pointer-events-auto"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <button
              onClick={handleAskClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-playful-mustard border-2 border-ink text-ink font-display text-xs font-bold
                shadow-chunky-sm hover:shadow-chunky hover:-translate-y-0.5
                active:shadow-none active:translate-y-0.5 transition-all whitespace-nowrap"
            >
              <span className="text-base leading-none">💡</span>
              Ask about this
            </button>
            {/* Tooltip arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
              border-l-[6px] border-l-transparent
              border-r-[6px] border-r-transparent
              border-t-[6px] border-t-ink" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Book body ─────────────────────────────────── */}
      <div className="flex flex-col h-full border-4 border-ink rounded-2xl bg-white shadow-chunky overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b-[3px] border-ink">
          <div className="px-3 py-2.5 flex items-center gap-2">
            <span className="font-display text-xs font-bold text-ink/40 uppercase tracking-wider truncate">
              {topicTitle}
            </span>
            <div className="flex-1" />
            <span className="font-body text-[10px] text-ink/30 tabular-nums shrink-0">
              {currentPage + 1}/{pages.length}
            </span>
          </div>
        </div>

        {/* Page title tab */}
        <div className="shrink-0 px-3 pt-3 pb-1 flex items-center gap-2">
          <div
            className={`${accentColor} border-2 border-ink rounded-lg px-2.5 py-1`}
          >
            <h2 className="font-display text-sm font-bold leading-tight">
              {page.title}
            </h2>
          </div>

          {/* Decorator */}
          {page.decorator && (
            <img
              src={page.decorator}
              alt=""
              className="w-5 h-5 object-contain select-none opacity-50 ml-auto"
            />
          )}
        </div>

        {/* Animated page content */}
        <div className="flex-1 min-h-0 px-3 pb-2 pt-1 relative overflow-hidden notebook-selectable">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 30,
                mass: 0.8,
              }}
              className="h-full"
              style={{ perspective: 600 }}
            >
              <NotebookPageContent page={page} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation footer */}
        <div className="shrink-0 border-t-[3px] border-ink px-3 py-2.5 flex items-center gap-2">
          {/* Left arrow */}
          <button
            onClick={() => paginate(-1)}
            disabled={currentPage === 0}
            className="w-8 h-8 rounded-lg border-2 border-ink bg-white flex items-center justify-center
              font-bold text-ink/60 shadow-chunky-sm transition-all
              hover:bg-ink hover:text-white hover:shadow-chunky hover:-translate-x-0.5 hover:-translate-y-0.5
              active:shadow-none active:translate-x-0.5 active:translate-y-0.5
              disabled:opacity-25 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0
              disabled:hover:bg-white disabled:hover:text-ink/60"
            aria-label="Previous page"
          >
            ‹
          </button>

          {/* Page dots */}
          <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
            {pages.map((p, i) => {
              const dotAccent = p.bgTint
                ? TINT_ACCENT[p.bgTint]
                : "bg-ink/30";
              return (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  className={`rounded-full border-[2px] border-ink/20 transition-all ${
                    i === currentPage
                      ? `w-3 h-3 ${dotAccent} border-ink/40 scale-110`
                      : "w-2.5 h-2.5 bg-ink/10 hover:bg-ink/20"
                  }`}
                  aria-label={`Go to page ${i + 1}: ${p.title}`}
                />
              );
            })}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => paginate(1)}
            disabled={currentPage === pages.length - 1}
            className="w-8 h-8 rounded-lg border-2 border-ink bg-white flex items-center justify-center
              font-bold text-ink/60 shadow-chunky-sm transition-all
              hover:bg-ink hover:text-white hover:shadow-chunky hover:-translate-x-0.5 hover:-translate-y-0.5
              active:shadow-none active:translate-x-0.5 active:translate-y-0.5
              disabled:opacity-25 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0
              disabled:hover:bg-white disabled:hover:text-ink/60"
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
