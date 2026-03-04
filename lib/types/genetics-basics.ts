// ═══════════════════════════════════════════════════════════
// GENETICS BASICS — Topic-specific types (Level 3, Ages 11–12)
// ═══════════════════════════════════════════════════════════

export type EyeColor = "brown" | "blue";
export type EarShape = "round" | "pointed";
export type Pattern = "spotted" | "solid";
export type Size = "large" | "small";

export type AlleleType = "dominant" | "recessive";

export interface Allele {
  trait: "eyeColor" | "earShape" | "pattern" | "size";
  value: EyeColor | EarShape | Pattern | Size;
  type: AlleleType;
  symbol: string; // e.g., "B" for dominant brown, "b" for recessive blue
}

export interface Genotype {
  eyeColor: [Allele, Allele];
  earShape: [Allele, Allele];
  pattern: [Allele, Allele];
  size: [Allele, Allele];
}

export interface Phenotype {
  eyeColor: EyeColor;
  earShape: EarShape;
  pattern: Pattern;
  size: Size;
}

export interface Creature {
  id: string;
  genotype: Genotype;
  phenotype: Phenotype;
}

export interface ParentCard {
  id: "parent1" | "parent2";
  creature: Creature;
}

export interface PunnettCell {
  row: 0 | 1;
  col: 0 | 1;
  allele1: Allele; // from parent 1
  allele2: Allele; // from parent 2
  genotype: [Allele, Allele];
  phenotype: EyeColor | EarShape | Pattern | Size;
}

export interface PunnettSquare {
  trait: "eyeColor" | "earShape" | "pattern" | "size";
  parent1Alleles: [Allele, Allele];
  parent2Alleles: [Allele, Allele];
  cells: PunnettCell[];
}

export interface LabJournalEntry {
  id: string;
  timestamp: number;
  type: "observation" | "prediction" | "result";
  content: string;
  trait?: "eyeColor" | "earShape" | "pattern" | "size";
}

export interface GeneticsBasicsSimState extends Record<string, unknown> {
  parents: [ParentCard, ParentCard];
  selectedTrait: "eyeColor" | "earShape" | "pattern" | "size";
  punnettSquare: PunnettSquare | null;
  offspring: Creature[];
  labJournal: LabJournalEntry[];
  crossCount: number; // Number of crosses performed
  recessiveDiscovered: boolean; // Has user seen a recessive phenotype appear?
  generationCount: number; // Track breeding generations
}

// ── Event Type Constants ────────────────────────────────────

export const GENETICS_BASICS_EVENTS = {
  FIRST_CROSS: "first_cross",
  RECESSIVE_APPEARS: "recessive_appears",
  SECOND_GENERATION: "second_generation",
  TRAIT_SELECTED: "trait_selected",
  PARENT_MODIFIED: "parent_modified",
  PUNNETT_COMPLETED: "punnett_completed",
  OFFSPRING_GENERATED: "offspring_generated",
  JOURNAL_ENTRY: "journal_entry",
  CHALLENGE_COMPLETED: "challenge_completed",
  MILESTONE: "milestone",
  IDLE_TIMEOUT: "idle_timeout",
} as const;

// ── Thresholds (seconds) ───────────────────────────────────

export const IDLE_THRESHOLD_S = 45;
export const MIN_CROSSES_FOR_MILESTONE = 3;

// ── Allele Definitions ──────────────────────────────────────

export const ALLELE_DEFINITIONS = {
  eyeColor: {
    dominant: { value: "brown" as EyeColor, symbol: "B" },
    recessive: { value: "blue" as EyeColor, symbol: "b" },
  },
  earShape: {
    dominant: { value: "round" as EarShape, symbol: "R" },
    recessive: { value: "pointed" as EarShape, symbol: "r" },
  },
  pattern: {
    dominant: { value: "spotted" as Pattern, symbol: "S" },
    recessive: { value: "solid" as Pattern, symbol: "s" },
  },
  size: {
    dominant: { value: "large" as Size, symbol: "L" },
    recessive: { value: "small" as Size, symbol: "l" },
  },
} as const;

// ── Initial State ───────────────────────────────────────────

export const INITIAL_GENETICS_BASICS: GeneticsBasicsSimState = {
  parents: [
    {
      id: "parent1",
      creature: {
        id: "p1",
        genotype: {
          eyeColor: [
            { trait: "eyeColor", value: "brown", type: "dominant", symbol: "B" },
            { trait: "eyeColor", value: "brown", type: "dominant", symbol: "B" },
          ],
          earShape: [
            { trait: "earShape", value: "round", type: "dominant", symbol: "R" },
            { trait: "earShape", value: "round", type: "dominant", symbol: "R" },
          ],
          pattern: [
            { trait: "pattern", value: "spotted", type: "dominant", symbol: "S" },
            { trait: "pattern", value: "spotted", type: "dominant", symbol: "S" },
          ],
          size: [
            { trait: "size", value: "large", type: "dominant", symbol: "L" },
            { trait: "size", value: "large", type: "dominant", symbol: "L" },
          ],
        },
        phenotype: {
          eyeColor: "brown",
          earShape: "round",
          pattern: "spotted",
          size: "large",
        },
      },
    },
    {
      id: "parent2",
      creature: {
        id: "p2",
        genotype: {
          eyeColor: [
            { trait: "eyeColor", value: "brown", type: "dominant", symbol: "B" },
            { trait: "eyeColor", value: "blue", type: "recessive", symbol: "b" },
          ],
          earShape: [
            { trait: "earShape", value: "round", type: "dominant", symbol: "R" },
            { trait: "earShape", value: "pointed", type: "recessive", symbol: "r" },
          ],
          pattern: [
            { trait: "pattern", value: "spotted", type: "dominant", symbol: "S" },
            { trait: "pattern", value: "solid", type: "recessive", symbol: "s" },
          ],
          size: [
            { trait: "size", value: "large", type: "dominant", symbol: "L" },
            { trait: "size", value: "small", type: "recessive", symbol: "l" },
          ],
        },
        phenotype: {
          eyeColor: "brown",
          earShape: "round",
          pattern: "spotted",
          size: "large",
        },
      },
    },
  ],
  selectedTrait: "eyeColor",
  punnettSquare: null,
  offspring: [],
  labJournal: [],
  crossCount: 0,
  recessiveDiscovered: false,
  generationCount: 0,
};
