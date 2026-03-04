// ═══════════════════════════════════════════════════════════
// GeneticsBasicsSimulation — Interactive genetics breeding lab
// Pure visual component — no AI logic, no companion awareness
// ═══════════════════════════════════════════════════════════

"use client";

import React, { useCallback, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SimulationProps } from "@/lib/types";
import {
  type GeneticsBasicsSimState,
  type Creature,
  type Allele,
  type Genotype,
  type Phenotype,
  type PunnettSquare,
  type PunnettCell,
  ALLELE_DEFINITIONS,
  GENETICS_BASICS_EVENTS as EVT,
} from "@/lib/types/genetics-basics";

// ── Genetic Utilities ───────────────────────────────────────

function calculatePhenotype(genotype: Genotype): Phenotype {
  const getPhenotypeTrait = (alleles: [Allele, Allele]) => {
    // If either allele is dominant, show dominant phenotype
    if (alleles[0].type === "dominant" || alleles[1].type === "dominant") {
      return alleles.find((a) => a.type === "dominant")!.value;
    }
    // Both recessive
    return alleles[0].value;
  };

  return {
    eyeColor: getPhenotypeTrait(genotype.eyeColor) as any,
    earShape: getPhenotypeTrait(genotype.earShape) as any,
    pattern: getPhenotypeTrait(genotype.pattern) as any,
    size: getPhenotypeTrait(genotype.size) as any,
  };
}

function generatePunnettSquare(
  trait: "eyeColor" | "earShape" | "pattern" | "size",
  parent1Genotype: Genotype,
  parent2Genotype: Genotype
): PunnettSquare {
  const parent1Alleles = parent1Genotype[trait];
  const parent2Alleles = parent2Genotype[trait];

  // Safety check
  if (!parent1Alleles || !parent2Alleles) {
    throw new Error(`Missing alleles for trait ${trait}`);
  }

  const cells: PunnettCell[] = [];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const allele1 = parent1Alleles[row];
      const allele2 = parent2Alleles[col];
      const genotype: [Allele, Allele] = [allele1, allele2];

      // Calculate phenotype for this cell
      const phenotype = allele1.type === "dominant" || allele2.type === "dominant"
        ? (allele1.type === "dominant" ? allele1.value : allele2.value)
        : allele1.value;

      cells.push({
        row: row as 0 | 1,
        col: col as 0 | 1,
        allele1,
        allele2,
        genotype,
        phenotype: phenotype as any,
      });
    }
  }

  return {
    trait,
    parent1Alleles,
    parent2Alleles,
    cells,
  };
}

function generateOffspring(punnettSquare: PunnettSquare, parentGenotypes: [Genotype, Genotype]): Creature[] {
  const offspring: Creature[] = [];
  const trait = punnettSquare.trait;

  // Generate 4 offspring based on Punnett square probabilities
  punnettSquare.cells.forEach((cell, idx) => {
    const newGenotype: Genotype = {
      eyeColor: parentGenotypes[0].eyeColor,
      earShape: parentGenotypes[0].earShape,
      pattern: parentGenotypes[0].pattern,
      size: parentGenotypes[0].size,
    };

    // Replace the selected trait with the cell's genotype
    newGenotype[trait] = cell.genotype;

    const phenotype = calculatePhenotype(newGenotype);

    offspring.push({
      id: `offspring-${Date.now()}-${idx}`,
      genotype: newGenotype,
      phenotype,
    });
  });

  return offspring;
}

// ── Creature Illustration Component ─────────────────────────

interface CreatureIllustrationProps {
  phenotype: Phenotype;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
  isSelected?: boolean;
}

function CreatureIllustration({ phenotype, size = "medium", onClick, isSelected }: CreatureIllustrationProps) {
  const sizeClass = size === "small" ? "w-16 h-16" : size === "large" ? "w-32 h-32" : "w-24 h-24";
  const scale = phenotype.size === "large" ? 1 : 0.75;

  return (
    <motion.div
      className={`${sizeClass} relative cursor-pointer`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={isSelected ? { scale: scale * 1.1 } : { scale }}
    >
      {/* Body */}
      <div
        className={`absolute inset-0 rounded-full border-4 border-ink ${
          phenotype.pattern === "spotted" ? "bg-gradient-to-br from-amber-200 to-amber-300" : "bg-amber-300"
        }`}
      >
        {/* Spots pattern */}
        {phenotype.pattern === "spotted" && (
          <>
            <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-amber-600/40" />
            <div className="absolute top-4 right-3 w-2 h-2 rounded-full bg-amber-600/40" />
            <div className="absolute bottom-3 left-4 w-2.5 h-2.5 rounded-full bg-amber-600/40" />
          </>
        )}
      </div>

      {/* Ears */}
      <div className="absolute -top-2 left-1/4 -translate-x-1/2">
        <div
          className={`w-4 h-6 border-3 border-ink bg-amber-200 ${
            phenotype.earShape === "round" ? "rounded-full" : "rounded-t-full"
          }`}
        />
      </div>
      <div className="absolute -top-2 right-1/4 translate-x-1/2">
        <div
          className={`w-4 h-6 border-3 border-ink bg-amber-200 ${
            phenotype.earShape === "round" ? "rounded-full" : "rounded-t-full"
          }`}
        />
      </div>

      {/* Eyes */}
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-ink">
        <div
          className={`w-2 h-2 rounded-full ${
            phenotype.eyeColor === "brown" ? "bg-amber-800" : "bg-blue-500"
          }`}
        />
      </div>
      <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-ink">
        <div
          className={`w-2 h-2 rounded-full ${
            phenotype.eyeColor === "brown" ? "bg-amber-800" : "bg-blue-500"
          }`}
        />
      </div>

      {/* Nose */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-pink-400 border-2 border-ink" />

      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-blue-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export function GeneticsBasicsSimulation({
  state,
  onStateChange,
  onEvent,
}: SimulationProps<GeneticsBasicsSimState>) {
  const {
    parents = [],
    selectedTrait = "eyeColor",
    punnettSquare = null,
    offspring = [],
    labJournal = []
  } = state || {};

  const [expandedOffspringId, setExpandedOffspringId] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [selectedOffspringForBreeding, setSelectedOffspringForBreeding] = useState<[string | null, string | null]>([null, null]);

  // ── Handle trait toggle ─────────────────────────────────
  const handleTraitToggle = useCallback(
    (parentId: "parent1" | "parent2", trait: "eyeColor" | "earShape" | "pattern" | "size") => {
      const parentIndex = parentId === "parent1" ? 0 : 1;
      const parent = parents[parentIndex];
      if (!parent) return;
      const currentGenotype = parent.creature.genotype[trait];

      // Cycle through genotype combinations: DD -> Dd -> dd -> DD
      const defs = ALLELE_DEFINITIONS[trait];
      const isDomDom = currentGenotype[0].type === "dominant" && currentGenotype[1].type === "dominant";
      const isHetero = currentGenotype[0].type !== currentGenotype[1].type;

      let newGenotype: [Allele, Allele];

      if (isDomDom) {
        // DD -> Dd
        newGenotype = [
          { trait, value: defs.dominant.value, type: "dominant", symbol: defs.dominant.symbol },
          { trait, value: defs.recessive.value, type: "recessive", symbol: defs.recessive.symbol },
        ];
      } else if (isHetero) {
        // Dd -> dd
        newGenotype = [
          { trait, value: defs.recessive.value, type: "recessive", symbol: defs.recessive.symbol },
          { trait, value: defs.recessive.value, type: "recessive", symbol: defs.recessive.symbol },
        ];
      } else {
        // dd -> DD
        newGenotype = [
          { trait, value: defs.dominant.value, type: "dominant", symbol: defs.dominant.symbol },
          { trait, value: defs.dominant.value, type: "dominant", symbol: defs.dominant.symbol },
        ];
      }

      const updatedGenotype = { ...parent.creature.genotype, [trait]: newGenotype };
      const updatedPhenotype = calculatePhenotype(updatedGenotype);

      const newParents = [...parents];
      newParents[parentIndex] = {
        ...parent,
        creature: {
          ...parent.creature,
          genotype: updatedGenotype,
          phenotype: updatedPhenotype,
        },
      };

      onStateChange({ parents: newParents as [any, any] });
      onEvent({ type: EVT.PARENT_MODIFIED, data: { parentId, trait } });
    },
    [parents, onStateChange, onEvent]
  );

  // ── Handle breed button ─────────────────────────────────
  const handleBreed = useCallback(() => {
    // Safety check: ensure parents data is complete
    if (!parents[0]?.creature?.genotype || !parents[1]?.creature?.genotype) {
      console.error("Cannot breed: parent genotype data is incomplete");
      return;
    }

    const square = generatePunnettSquare(selectedTrait, parents[0].creature.genotype, parents[1].creature.genotype);
    const newOffspring = generateOffspring(square, [parents[0].creature.genotype, parents[1].creature.genotype]);

    const isFirstCross = state.crossCount === 0;
    const hasRecessive = newOffspring.some(o => {
      const traitAlleles = o.genotype[selectedTrait];
      return traitAlleles[0].type === "recessive" && traitAlleles[1].type === "recessive";
    });

    onStateChange({
      punnettSquare: square,
      offspring: newOffspring,
      crossCount: state.crossCount + 1,
      recessiveDiscovered: state.recessiveDiscovered || hasRecessive,
    });

    if (isFirstCross) {
      onEvent({ type: EVT.FIRST_CROSS, data: { trait: selectedTrait } });
    }

    if (hasRecessive && !state.recessiveDiscovered) {
      onEvent({ type: EVT.RECESSIVE_APPEARS, data: { trait: selectedTrait } });
    }

    onEvent({ type: EVT.OFFSPRING_GENERATED, data: { count: newOffspring.length, trait: selectedTrait } });
  }, [selectedTrait, parents, state, onStateChange, onEvent]);

  // ── Handle offspring selection for second generation ────
  const handleOffspringSelect = useCallback((offspringId: string) => {
    const [first, second] = selectedOffspringForBreeding;

    if (first === offspringId) {
      setSelectedOffspringForBreeding([null, second]);
    } else if (second === offspringId) {
      setSelectedOffspringForBreeding([first, null]);
    } else if (first === null) {
      setSelectedOffspringForBreeding([offspringId, second]);
    } else if (second === null) {
      setSelectedOffspringForBreeding([first, offspringId]);

      // Auto-breed when two are selected
      const offspring1 = offspring.find(o => o.id === first)!;
      const offspring2 = offspring.find(o => o.id === offspringId)!;

      const newParents = [
        { id: "parent1" as const, creature: offspring1 },
        { id: "parent2" as const, creature: offspring2 },
      ];

      onStateChange({
        parents: newParents as [any, any],
        offspring: [],
        punnettSquare: null,
        generationCount: state.generationCount + 1,
      });

      setSelectedOffspringForBreeding([null, null]);
      onEvent({ type: EVT.SECOND_GENERATION, data: { generation: state.generationCount + 1 } });
    }
  }, [selectedOffspringForBreeding, offspring, state, onStateChange, onEvent]);

  // ── Genotype string display ────────────────────────────
  const getGenotypeString = (genotype: Genotype, trait: "eyeColor" | "earShape" | "pattern" | "size") => {
    const alleles = genotype[trait];
    return `${alleles[0].symbol}${alleles[1].symbol}`;
  };

  return (
    <div className="flex flex-col w-full h-full select-none p-4 gap-6">
      {/* ── Top Half: Parent Cards ──────────────────────── */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink/80">Parents</h2>
          <div className="text-sm text-ink/50">Generation {state.generationCount + 1}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {parents.map((parent, idx) => (
            <motion.div
              key={parent.id}
              className="border-4 border-ink rounded-2xl bg-paper p-4 shadow-chunky"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="font-display font-bold text-ink/70">Parent {idx + 1}</div>
                <CreatureIllustration phenotype={parent.creature.phenotype} size="large" />

                {/* Trait toggles */}
                <div className="w-full space-y-2">
                  {(["eyeColor", "earShape", "pattern", "size"] as const).map((trait) => {
                    const genotype = parent.creature.genotype[trait];
                    const genotypeStr = getGenotypeString(parent.creature.genotype, trait);
                    const isDominant = genotype[0].type === "dominant" || genotype[1].type === "dominant";

                    return (
                      <button
                        key={trait}
                        onClick={() => handleTraitToggle(parent.id, trait)}
                        className="w-full px-3 py-2 border-3 border-ink rounded-lg bg-white hover:bg-amber-50 transition-colors flex items-center justify-between text-sm"
                      >
                        <span className="capitalize">{trait.replace(/([A-Z])/g, " $1")}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{genotypeStr}</span>
                          {isDominant && (
                            <span className="px-1.5 py-0.5 bg-amber-400 border-2 border-ink rounded text-xs font-bold">
                              D
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trait selector and breed button */}
        <div className="flex items-center gap-4">
          <select
            value={selectedTrait}
            onChange={(e) => onStateChange({ selectedTrait: e.target.value as any })}
            className="flex-1 px-4 py-3 border-3 border-ink rounded-lg bg-white font-body text-base"
          >
            <option value="eyeColor">Eye Color</option>
            <option value="earShape">Ear Shape</option>
            <option value="pattern">Pattern</option>
            <option value="size">Size</option>
          </select>

          <button
            onClick={handleBreed}
            className="px-6 py-3 bg-amber-400 border-3 border-ink rounded-lg font-display font-bold shadow-chunky hover:translate-y-0.5 hover:shadow-chunky-sm active:translate-y-1 active:shadow-none transition-all"
          >
            Breed
          </button>
        </div>
      </div>

      {/* ── Bottom Half: Punnett Square & Offspring ─────── */}
      <div className="flex-1 flex flex-col gap-4">
        <h2 className="font-display text-xl font-bold text-ink/80">Results</h2>

        {punnettSquare && (
          <div className="grid grid-cols-2 gap-4">
            {/* Punnett Square */}
            <div className="border-4 border-ink rounded-2xl bg-white p-4 shadow-chunky">
              <div className="text-center font-display font-bold text-ink/70 mb-3">Punnett Square</div>
              <div className="grid grid-cols-3 gap-2">
                <div />
                {punnettSquare.parent2Alleles.map((allele, idx) => (
                  <div key={idx} className="text-center font-mono font-bold text-sm">
                    {allele.symbol}
                  </div>
                ))}

                {[0, 1].map((row) => (
                  <React.Fragment key={`row-${row}`}>
                    <div className="flex items-center justify-center font-mono font-bold text-sm">
                      {punnettSquare.parent1Alleles[row].symbol}
                    </div>
                    {[0, 1].map((col) => {
                      const cell = punnettSquare.cells.find(c => c.row === row && c.col === col)!;
                      return (
                        <div
                          key={`${row}-${col}`}
                          className="aspect-square border-2 border-ink rounded-lg bg-amber-50 flex items-center justify-center font-mono text-sm font-bold"
                        >
                          {cell.allele1.symbol}{cell.allele2.symbol}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Offspring */}
            <div className="border-4 border-ink rounded-2xl bg-white p-4 shadow-chunky">
              <div className="text-center font-display font-bold text-ink/70 mb-3">Offspring</div>
              <div className="grid grid-cols-2 gap-3">
                {offspring.map((creature) => (
                  <div
                    key={creature.id}
                    className="flex flex-col items-center gap-2 p-2 border-2 border-ink rounded-lg bg-paper hover:bg-amber-50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (expandedOffspringId === creature.id) {
                        setExpandedOffspringId(null);
                      } else {
                        setExpandedOffspringId(creature.id);
                      }
                    }}
                  >
                    <CreatureIllustration
                      phenotype={creature.phenotype}
                      size="small"
                      onClick={() => handleOffspringSelect(creature.id)}
                      isSelected={selectedOffspringForBreeding.includes(creature.id)}
                    />

                    <AnimatePresence>
                      {expandedOffspringId === creature.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs font-mono text-center"
                        >
                          {getGenotypeString(creature.genotype, selectedTrait)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {offspring.length > 0 && (
                <div className="mt-3 text-xs text-center text-ink/50">
                  Tap to select for breeding
                </div>
              )}
            </div>
          </div>
        )}

        {!punnettSquare && (
          <div className="flex-1 flex items-center justify-center text-ink/30 font-body">
            Click "Breed" to see results
          </div>
        )}
      </div>

      {/* ── Lab Journal Panel ───────────────────────────── */}
      <button
        onClick={() => setJournalOpen(!journalOpen)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-blue-400 border-3 border-ink rounded-lg font-display font-bold shadow-chunky hover:translate-y-0.5 transition-transform"
      >
        Lab Journal ({labJournal.length})
      </button>

      <AnimatePresence>
        {journalOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed top-0 right-0 w-80 h-full bg-paper border-l-4 border-ink shadow-2xl p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold text-ink/80">Lab Journal</h3>
              <button
                onClick={() => setJournalOpen(false)}
                className="text-2xl text-ink/50 hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {labJournal.map((entry) => (
                <div key={entry.id} className="p-3 border-2 border-ink rounded-lg bg-white text-sm">
                  <div className="font-bold text-ink/70 mb-1">{entry.type}</div>
                  <div className="text-ink/60">{entry.content}</div>
                </div>
              ))}

              {labJournal.length === 0 && (
                <div className="text-center text-ink/30 py-8">
                  No entries yet. Start breeding to log observations!
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
