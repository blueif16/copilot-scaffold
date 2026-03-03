// ═══════════════════════════════════════════════════════════
// SOUND KEY CONSTANTS — stubs only, no audio files yet
// ═══════════════════════════════════════════════════════════

export const SOUNDS = {
  // Phase transitions
  ICE_CRACKLE: "ice_crackle",
  WATER_BUBBLE: "water_bubble",
  STEAM_HISS: "steam_hiss",
  TRANSITION_CHIME: "transition_chime",

  // Companion
  GENTLE_CHIME: "gentle_chime",
  DISCOVERY_CHIME: "discovery_chime",
  ACHIEVEMENT: "achievement",

  // Ambient
  AMBIENT_COLD: "ambient_cold",
  AMBIENT_WARM: "ambient_warm",
  AMBIENT_HOT: "ambient_hot",
} as const;

export type SoundKey = (typeof SOUNDS)[keyof typeof SOUNDS];
