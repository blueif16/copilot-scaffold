"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type ComponentType,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCoAgent } from "@copilotkit/react-core";
import { useCopilotChatInternal } from "@copilotkit/react-core";
import { useCopilotReadable } from "@copilotkit/react-core";
import { useCopilotAction } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import type {
  CoAgentState,
  ReactionPayload,
  SimulationEvent,
  SimulationProps,
  TopicConfig,
} from "@/lib/types";
import { Companion } from "@/components/companion/Companion";
import { ChatOverlay, type ChatMessage } from "@/components/chat/ChatOverlay";
import { SpotlightCard } from "@/components/spotlight/SpotlightCard";
import { LabNotebook } from "@/components/notebook/LabNotebook";
import { SoundManagerProvider, useSoundManager } from "./SoundManager";

// ── TopicRunner Props ───────────────────────────────────

interface TopicRunnerProps<
  SimState extends Record<string, unknown>,
  E extends string = never,
  A extends string = never,
> {
  config: TopicConfig<SimState, E, A>;
  SimulationComponent: ComponentType<SimulationProps<SimState>>;
  /** When the left nav strip drawer is open, chat auto-closes */
  stripOpen?: boolean;
}

// ── Inner component (needs SoundManager context) ────────

function TopicRunnerInner<
  SimState extends Record<string, unknown>,
  E extends string = never,
  A extends string = never,
>({
  config,
  SimulationComponent,
  stripOpen = false,
}: TopicRunnerProps<SimState, E, A>) {
  const soundManager = useSoundManager();

  // ── Channel 1 & 2: CoAgent (shared state) ────────────
  //
  // Zone separation enforced by convention:
  // - handleSimStateChange only writes to simulation + events (Zone 1)
  // - Backend only writes to companion via copilotkit_emit_state (Zone 2)

  const { state, setState, run } = useCoAgent<CoAgentState<SimState>>({
    name: `observation-${config.id}`,
    initialState: {
      simulation: config.initialSimulationState,
      events: { latest: null, history: [] },
      companion: {
        currentReaction: null,
        reactionHistory: [],
        progress: config.initialProgress,
        spotlightUnlocked: false,
        suggestedQuestions: [],
      },
    },
  });

  // ── Channel 3: Chat (headless) ────────────────────────
  //
  // useCopilotChat sends messages to the default agent set on
  // <CopilotKit agent="...">. The page sets this to "chat-changing-states".

  const {
    messages: visibleMessages,
    appendMessage,
    isLoading: chatIsLoading,
    isAvailable: chatIsAvailable,
  } = useCopilotChatInternal();

  // Debug: log chat availability
  useEffect(() => {
    console.log("[TopicRunner] Chat available:", chatIsAvailable);
    console.log("[TopicRunner] Chat loading:", chatIsLoading);
  }, [chatIsAvailable, chatIsLoading]);

  // ── Bridge: Readable context for agents ───────────────
  // Categories scope visibility: observation agent sees simulation,
  // chat agent sees simulation + companion context.

  useCopilotReadable({
    description: "Current simulation state for the learning topic",
    value: {
      topic: config.id,
      ageRange: config.ageRange,
      simulationState: state?.simulation ?? config.initialSimulationState,
    },
    categories: ["observation", "chat"],
  });

  useCopilotReadable({
    description: "Learning progress, reaction history, and companion context",
    value: {
      progress: state?.companion?.progress ?? config.initialProgress,
      reactionHistory: state?.companion?.reactionHistory ?? [],
      lastReaction: state?.companion?.currentReaction ?? null,
      spotlightUnlocked: state?.companion?.spotlightUnlocked ?? false,
    },
    categories: ["chat"],
  });

  // ── Event trigger: useCopilotAction ───────────────────
  //
  // Defines the action the observation agent can invoke.
  // "remote" = only backend agent can invoke, not from chat UI.
  // The handler returns event data for the agent to process.

  useCopilotAction({
    name: "processSimulationEvent",
    description:
      "Process a meaningful simulation event and generate a companion reaction",
    available: "remote",
    parameters: [
      {
        name: "eventType",
        type: "string",
        description: "The classified event type",
        required: true,
      },
      {
        name: "eventData",
        type: "object" as const,
        description: "Event-specific data payload",
        required: true,
      },
    ],
    handler: async ({ eventType, eventData }) => {
      return { eventType, eventData, simulationState: state?.simulation ?? config.initialSimulationState };
    },
  });

  // ── Zone 1: Simulation state handler ──────────────────
  // Only writes to simulation + events, never touches companion

  const handleSimStateChange = useCallback(
    (partial: Partial<SimState>) => {
      setState((prev: CoAgentState<SimState> | undefined) => {
        if (!prev) return prev as unknown as CoAgentState<SimState>;
        return {
          ...prev,
          simulation: { ...prev.simulation, ...partial },
        };
      });
    },
    [setState],
  );

  // ── Event emitter (debounced + triggers observation agent) ──

  const eventDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventCountsRef = useRef<Record<string, number>>({});

  const handleEvent = useCallback(
    (event: Omit<SimulationEvent, "timestamp">) => {
      // Don't process events if state isn't initialized yet
      if (!state) return;

      const fullEvent: SimulationEvent = {
        ...event,
        timestamp: Date.now(),
      };

      // Track event counts for threshold decisions
      const count = (eventCountsRef.current[event.type] ?? 0) + 1;
      eventCountsRef.current[event.type] = count;
      fullEvent.data = { ...fullEvent.data, times_seen: count };

      // Debounce rapid events
      if (eventDebounceRef.current) {
        clearTimeout(eventDebounceRef.current);
      }

      eventDebounceRef.current = setTimeout(() => {
        // 1. Write event to state (Zone 1 — history tracking)
        setState((prev: CoAgentState<SimState> | undefined) => {
          if (!prev) return prev as unknown as CoAgentState<SimState>;
          return {
            ...prev,
            events: {
              latest: fullEvent,
              history: [...(prev.events?.history ?? []).slice(-49), fullEvent], // Cap history at 50
            },
          };
        });

        // 2. Trigger the observation agent to process the event.
        //    run() executes the observation graph with current state.
        if (run && state) {
          try {
            run();
          } catch (error) {
            console.warn("Failed to run observation agent:", error);
          }
        }

        // 3. Play sound if the event type has a mapped sound
        if (event.type === "phase_change") {
          soundManager.play("transition_chime");
        } else if (event.type === "milestone") {
          soundManager.play("achievement");
        }
      }, config.eventDebounceMs ?? 150);
    },
    [setState, run, config.eventDebounceMs, soundManager, state],
  );

  // ── Reaction display management ───────────────────────
  // Auto-dismiss reactions after their expiry time.
  // Dedup: skip reactions already in history.

  const [displayedReaction, setDisplayedReaction] =
    useState<ReactionPayload | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reaction = state?.companion?.currentReaction;
    if (!reaction) {
      setDisplayedReaction(null);
      return;
    }

    // Dedup: skip if this exact reaction ID was already shown (one-shot guard)
    const history = state?.companion?.reactionHistory ?? [];
    const occurrences = history.filter((id) => id === reaction.reactionId).length;
    if (occurrences > 1 && reaction.source === "programmed") {
      // Already shown before and it was one-shot — skip display
      return;
    }

    // Only update if it's a new reaction (different timestamp or ID)
    if (
      !displayedReaction ||
      reaction.timestamp !== displayedReaction.timestamp ||
      reaction.reactionId !== displayedReaction.reactionId
    ) {
      setDisplayedReaction(reaction);

      // Play reaction sound
      if (reaction.sound) {
        soundManager.play(reaction.sound);
      }

      // Clear previous timer
      if (reactionTimerRef.current) {
        clearTimeout(reactionTimerRef.current);
      }

      // Auto-expire
      if (reaction.autoExpireMs > 0) {
        reactionTimerRef.current = setTimeout(() => {
          setDisplayedReaction(null);
        }, reaction.autoExpireMs);
      }
    }

    return () => {
      if (reactionTimerRef.current) {
        clearTimeout(reactionTimerRef.current);
      }
    };
  }, [state?.companion?.currentReaction, state?.companion?.reactionHistory, soundManager]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Suggested questions cycling ───────────────────────
  // Show context-appropriate suggested questions from the
  // topic config, cycling based on current simulation state.

  const contextualSuggestions = useMemo(() => {
    const simState = (state?.simulation ?? config.initialSimulationState) as Record<string, unknown>;
    const phase = (simState.phase as string) ?? "";
    const progress = (state?.companion?.progress ?? config.initialProgress) as Record<string, unknown>;

    // Priority: milestone suggestions > phase-specific > generic
    if (progress.all_phases_discovered && config.suggestedQuestions.all_phases_discovered) {
      return config.suggestedQuestions.all_phases_discovered;
    }
    if (phase && config.suggestedQuestions[phase]) {
      return config.suggestedQuestions[phase];
    }
    // Fallback: first available set
    const firstKey = Object.keys(config.suggestedQuestions)[0];
    return firstKey ? config.suggestedQuestions[firstKey] : [];
  }, [state?.simulation, state?.companion?.progress, config.suggestedQuestions, config.initialSimulationState, config.initialProgress]);

  // ── Chat panel state ──────────────────────────────────
  // Map CopilotKit messages to ChatMessage format for ChatOverlay

  const [chatOpen, setChatOpen] = useState(false);

  // Auto-close chat when the left nav strip drawer opens
  useEffect(() => {
    if (stripOpen) setChatOpen(false);
  }, [stripOpen]);

  const chatMessages: ChatMessage[] = useMemo(
    () => {
      console.log("[TopicRunner] visibleMessages raw:", visibleMessages);
      console.log("[TopicRunner] visibleMessages count:", visibleMessages?.length ?? 0);

      const filtered = (visibleMessages ?? [])
        .filter(
          (msg) => {
            const hasContent = "content" in msg;
            const content = (msg as Record<string, unknown>).content;
            const isString = typeof content === "string";
            const isArray = Array.isArray(content);

            console.log("[TopicRunner] Message filter:", {
              id: msg.id,
              role: (msg as Record<string, unknown>).role,
              hasContent,
              contentType: typeof content,
              isString,
              isArray,
              content: isArray ? content : String(content).substring(0, 100),
            });

            return hasContent && (isString || isArray) &&
              (isString ? String(content).trim() !== "" : content.length > 0);
          }
        );

      console.log("[TopicRunner] Filtered messages count:", filtered.length);

      const mapped = filtered.map((msg) => {
          const content = (msg as Record<string, unknown>).content;
          const contentStr = typeof content === "string"
            ? content
            : Array.isArray(content) && content[0]?.text
              ? content[0].text
              : String(content);

          const chatMsg = {
            id: msg.id,
            role:
              (msg as unknown as Record<string, unknown>).role === Role.User
                ? ("user" as const)
                : ("assistant" as const),
            content: contentStr,
          };

          console.log("[TopicRunner] Mapped message:", chatMsg);
          return chatMsg;
        });

      console.log("[TopicRunner] Final chatMessages:", mapped);
      return mapped;
    },
    [visibleMessages],
  );

  const handleChatSend = useCallback(
    async (text: string) => {
      console.log("[TopicRunner] Sending message:", text);
      console.log("[TopicRunner] Chat available before send:", chatIsAvailable);
      console.log("[TopicRunner] appendMessage function:", typeof appendMessage);

      try {
        await appendMessage(new TextMessage({ content: text, role: Role.User }));
        console.log("[TopicRunner] Message sent successfully");
      } catch (error) {
        console.error("[TopicRunner] Error sending message:", error);
      }

      console.log("[TopicRunner] visibleMessages after send:", visibleMessages);
    },
    [appendMessage, visibleMessages, chatIsAvailable],
  );

  const handleSuggestionTap = useCallback(
    (question: string) => {
      setChatOpen(true);
      // Small delay so the chat overlay opens first
      setTimeout(() => handleChatSend(question), 100);
    },
    [handleChatSend],
  );

  const handleCompanionTap = useCallback(() => {
    setChatOpen(true);
  }, []);

  // ── Spotlight tap ─────────────────────────────────────

  const handleSpotlightTap = useCallback(() => {
    handleEvent({ type: "spotlight_tap", data: {} });
  }, [handleEvent]);

  // ── Merge reaction suggestions with contextual ones ───
  // If the current reaction has suggestions, show those.
  // Otherwise show contextual suggestions on the companion.

  const activeSuggestions = useMemo(() => {
    if (
      displayedReaction?.suggestions &&
      displayedReaction.suggestions.length > 0
    ) {
      return displayedReaction.suggestions;
    }
    // Only show contextual suggestions when idle (no reaction displayed)
    if (!displayedReaction && contextualSuggestions.length > 0) {
      return contextualSuggestions.slice(0, 2);
    }
    return null;
  }, [displayedReaction, contextualSuggestions]);

  // Build an augmented reaction with merged suggestions for companion display
  const companionReaction = useMemo<ReactionPayload | null>(() => {
    if (displayedReaction) return displayedReaction;
    // When idle but we have contextual suggestions, create a lightweight
    // suggestion-only reaction so bubbles render
    if (activeSuggestions && activeSuggestions.length > 0) {
      return {
        message: null,
        suggestions: activeSuggestions,
        emotion: "idle" as const,
        animation: null,
        sound: null,
        type: "suggestion" as const,
        priority: 0,
        autoExpireMs: 0,
        unlockSpotlight: false,
        progressUpdate: null,
        source: "programmed" as const,
        reactionId: "contextual-suggestions",
        timestamp: 0,
      };
    }
    return null;
  }, [displayedReaction, activeSuggestions]);

  // ── Calculate companion progress ──────────────────────

  const companionProgress = useMemo(() => {
    if (config.progressCalculator) {
      return config.progressCalculator(state?.companion?.progress ?? config.initialProgress);
    }
    return 0;
  }, [state?.companion?.progress, config.progressCalculator, config.initialProgress]);

  // ── Dev tools for testing ─────────────────────────────

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__injectReaction = (
        reaction: ReactionPayload,
      ) => {
        setState((prev: CoAgentState<SimState> | undefined) => {
          if (!prev) return prev as unknown as CoAgentState<SimState>;
          return {
            ...prev,
            companion: {
              ...prev.companion,
              currentReaction: {
                ...reaction,
                timestamp: reaction.timestamp || Date.now(),
              },
              reactionHistory: [
                ...prev.companion.reactionHistory,
                reaction.reactionId,
              ],
            },
          };
        });
      };

      (window as unknown as Record<string, unknown>).__unlockSpotlight = () => {
        setState((prev: CoAgentState<SimState> | undefined) => {
          if (!prev) return prev as unknown as CoAgentState<SimState>;
          return {
            ...prev,
            companion: {
              ...prev.companion,
              spotlightUnlocked: true,
            },
          };
        });
      };

      (window as unknown as Record<string, unknown>).__getState = () => state;
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────

  // Safety: wait for state to initialize before rendering
  if (!state) {
    return null;
  }

  const hasNotebook = config.labNotebook && config.labNotebook.length > 0;

  return (
    <div className="relative w-full h-full flex flex-row gap-3 py-3 pr-3">
      {/* Center: Notebook + Simulation side by side */}
      <div className="flex-1 min-w-0 h-full flex flex-row gap-5 pl-3">
        {/* Lab Notebook */}
        {hasNotebook && (
          <div className="w-[520px] shrink-0 h-full">
            <LabNotebook
              pages={config.labNotebook!}
              topicTitle={config.id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            />
          </div>
        )}

        {/* Simulation card */}
        <div className="flex-1 flex flex-col relative min-w-0 bg-paper rounded-2xl overflow-hidden">
          <div className="flex-1 flex flex-col p-4 sm:p-6 pb-24">
            <SimulationComponent
              state={{ ...config.initialSimulationState, ...state?.simulation }}
              onStateChange={handleSimStateChange}
              onEvent={handleEvent}
            />
          </div>

          {/* Companion — hidden when chat is open (it "becomes" the chat) */}
          {!chatOpen && (
            <Companion
              reaction={companionReaction}
              onSuggestionTap={handleSuggestionTap}
              onCompanionTap={handleCompanionTap}
              progress={companionProgress}
            />
          )}

          {/* Spotlight card — top-left, appears when unlocked */}
          {config.spotlightContent && (
            <SpotlightCard
              config={config.spotlightContent}
              visible={state?.companion?.spotlightUnlocked ?? false}
              onTap={handleSpotlightTap}
            />
          )}
        </div>
      </div>

      {/* Right: Chat panel — full height, slides in */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full overflow-hidden flex-shrink-0"
          >
            <ChatOverlay
              messages={chatMessages}
              onSend={handleChatSend}
              onClose={() => setChatOpen(false)}
              isLoading={chatIsLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main export (wraps with SoundManager provider) ──────

export function TopicRunner<
  SimState extends Record<string, unknown>,
  E extends string = never,
  A extends string = never,
>(props: TopicRunnerProps<SimState, E, A>) {
  return (
    <SoundManagerProvider>
      <TopicRunnerInner {...props} />
    </SoundManagerProvider>
  );
}
