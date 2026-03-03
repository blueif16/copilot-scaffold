import type { ReactionPayload } from "@/lib/types";

/**
 * Sample ReactionPayload objects for testing companion rendering.
 * Use in dev console: window.__injectReaction(MOCK_REACTIONS.welcome)
 */
export const MOCK_REACTIONS: Record<string, ReactionPayload> = {
  welcome: {
    message: "Ooh, try sliding it! See what happens to the tiny particles!",
    suggestions: null,
    emotion: "excited",
    animation: "point",
    sound: "gentle_chime",
    type: "prompt",
    priority: 20,
    autoExpireMs: 5000,
    unlockSpotlight: false,
    progressUpdate: null,
    source: "programmed",
    reactionId: "welcome",
    timestamp: Date.now(),
  },

  firstMelt: {
    message:
      "Whoa! You melted it! See how the particles started moving apart?",
    suggestions: null,
    emotion: "excited",
    animation: "bounce",
    sound: "discovery_chime",
    type: "observation",
    priority: 15,
    autoExpireMs: 5000,
    unlockSpotlight: false,
    progressUpdate: null,
    source: "programmed",
    reactionId: "first_solid_to_liquid",
    timestamp: Date.now(),
  },

  dwellCurious: {
    message: null,
    suggestions: [
      "Can you find the exact spot where it melts?",
      "What happens if you keep heating it?",
    ],
    emotion: "curious",
    animation: "tilt_head",
    sound: null,
    type: "suggestion",
    priority: 4,
    autoExpireMs: 10000,
    unlockSpotlight: false,
    progressUpdate: null,
    source: "programmed",
    reactionId: "dwell_liquid",
    timestamp: Date.now(),
  },

  milestone: {
    message:
      "You discovered all three states of matter! Solid, liquid, and gas — you're a real scientist!",
    suggestions: [
      "What was the coolest change?",
      "Where does the steam go?",
    ],
    emotion: "celebrating",
    animation: "confetti",
    sound: "achievement",
    type: "milestone",
    priority: 20,
    autoExpireMs: 8000,
    unlockSpotlight: true,
    progressUpdate: {
      all_phases_discovered: true,
      spotlight_available: true,
    },
    source: "programmed",
    reactionId: "all_phases_discovered",
    timestamp: Date.now(),
  },

  encouraging: {
    message: "Hey! Try moving the slider — I wonder what will happen!",
    suggestions: null,
    emotion: "encouraging",
    animation: "wave",
    sound: null,
    type: "prompt",
    priority: 6,
    autoExpireMs: 6000,
    unlockSpotlight: false,
    progressUpdate: null,
    source: "programmed",
    reactionId: "idle_nudge",
    timestamp: Date.now(),
  },

  aiGenerated: {
    message:
      "You keep going back and forth — are you testing the boundary? That's what real scientists do!",
    suggestions: null,
    emotion: "impressed",
    animation: "nod",
    sound: null,
    type: "observation",
    priority: 8,
    autoExpireMs: 5000,
    unlockSpotlight: false,
    progressUpdate: null,
    source: "ai",
    reactionId: "ai-1234567890",
    timestamp: Date.now(),
  },

  thinking: {
    message: null,
    suggestions: null,
    emotion: "thinking",
    animation: "none",
    sound: null,
    type: "observation",
    priority: 1,
    autoExpireMs: 3000,
    unlockSpotlight: false,
    progressUpdate: null,
    source: "ai",
    reactionId: "ai-thinking",
    timestamp: Date.now(),
  },

  watching: {
    message: null,
    suggestions: null,
    emotion: "watching",
    animation: "none",
    sound: null,
    type: "observation",
    priority: 1,
    autoExpireMs: 0,
    unlockSpotlight: false,
    progressUpdate: null,
    source: "programmed",
    reactionId: "watching-quietly",
    timestamp: Date.now(),
  },
};

/**
 * All mock reactions as an array, useful for cycling through them.
 */
export const ALL_MOCK_REACTIONS = Object.values(MOCK_REACTIONS);
