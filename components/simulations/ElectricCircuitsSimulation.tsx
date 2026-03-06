// ═══════════════════════════════════════════════════════════
// ElectricCircuitsSimulation — Interactive circuit builder
// Pure visual component — no AI logic, no companion awareness
// ═══════════════════════════════════════════════════════════

"use client";

import { useCallback, useRef, useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SimulationProps } from "@/lib/types";
import {
  type ElectricCircuitsSimState,
  type CircuitComponent,
  type ComponentType,
  GRID_SIZE,
  WORKSPACE_WIDTH,
  WORKSPACE_HEIGHT,
  ELECTRIC_CIRCUITS_EVENTS,
} from "@/lib/types/electric-circuits";
import { useEventEmitter } from "./useEventEmitter";

// ── Component Icons ─────────────────────────────────────────

const COMPONENT_ICONS: Record<ComponentType, string> = {
  battery: "/assets/battery.png",
  wire: "/assets/wire.png",
  lightbulb: "/assets/light_bulb.png",
  switch: "/assets/switch.png",
  motor: "/assets/motor.png",
  resistor: "/assets/resistor.png",
};

const COMPONENT_LABELS: Record<ComponentType, string> = {
  battery: "Battery",
  wire: "Wire",
  lightbulb: "Light Bulb",
  switch: "Switch",
  motor: "Motor",
  resistor: "Resistor",
};

// ── Helper Functions ────────────────────────────────────────

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE);
}

function isAdjacent(pos1: { x: number; y: number }, pos2: { x: number; y: number }): boolean {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function checkCircuitComplete(components: CircuitComponent[]): boolean {
  const battery = components.find((c) => c.type === "battery");
  if (!battery) return false;

  // Check if there's at least one lightbulb or motor (load component)
  const hasLoad = components.some((c) => c.type === "lightbulb" || c.type === "motor");
  if (!hasLoad) return false;

  // Build adjacency map for path finding
  const adjacencyMap = new Map<string, Set<string>>();
  components.forEach((comp) => {
    if (!adjacencyMap.has(comp.id)) {
      adjacencyMap.set(comp.id, new Set());
    }
    comp.connections.forEach((connId) => {
      adjacencyMap.get(comp.id)!.add(connId);
    });
  });

  // BFS to find if there's a path from battery back to itself (closed loop)
  // that includes at least one load component
  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [{ id: battery.id, path: [battery.id] }];

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    const neighbors = Array.from(adjacencyMap.get(id) || new Set<string>());
    for (const neighborId of neighbors) {
      // Found a path back to battery
      if (neighborId === battery.id && path.length > 2) {
        // Check if path includes a load component
        const pathHasLoad = path.some((compId) => {
          const comp = components.find((c) => c.id === compId);
          return comp && (comp.type === "lightbulb" || comp.type === "motor");
        });
        if (pathHasLoad) return true;
      }

      // Continue exploring
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ id: neighborId, path: [...path, neighborId] });
      }
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function ElectricCircuitsSimulation({
  state,
  onStateChange,
  onEvent,
}: SimulationProps<ElectricCircuitsSimState>) {
  const { components, isComplete, currentFlow } = state;
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [draggedComponent, setDraggedComponent] = useState<ComponentType | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  // ── Event emitter ─────────────────────────────────────────
  const { handleFirstInteraction } = useEventEmitter({ onEvent });

  // ── Drag handlers ─────────────────────────────────────────

  const handleDragStart = useCallback((type: ComponentType) => {
    setDraggedComponent(type);
    handleFirstInteraction();
  }, [handleFirstInteraction]);

  const handleDragMove = useCallback((e: React.DragEvent) => {
    if (!workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragPosition({ x, y });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedComponent || !workspaceRef.current) return;

      const rect = workspaceRef.current.getBoundingClientRect();
      const x = snapToGrid(e.clientX - rect.left);
      const y = snapToGrid(e.clientY - rect.top);

      // Check bounds
      if (x < 0 || y < 0 || x >= WORKSPACE_WIDTH / GRID_SIZE || y >= WORKSPACE_HEIGHT / GRID_SIZE) {
        setDraggedComponent(null);
        setDragPosition(null);
        return;
      }

      // Create new component
      const newComponent: CircuitComponent = {
        id: `${draggedComponent}-${Date.now()}`,
        type: draggedComponent,
        position: { x, y },
        rotation: 0,
        connections: [],
      };

      // Auto-connect to adjacent components
      const newConnections: string[] = [];
      components.forEach((comp) => {
        if (isAdjacent(comp.position, newComponent.position)) {
          newConnections.push(comp.id);
          comp.connections.push(newComponent.id);
        }
      });
      newComponent.connections = newConnections;

      const updatedComponents = [...components, newComponent];
      const circuitComplete = checkCircuitComplete(updatedComponents);

      onStateChange({
        components: updatedComponents,
        isComplete: circuitComplete,
        currentFlow: circuitComplete,
      });

      onEvent({
        type: ELECTRIC_CIRCUITS_EVENTS.COMPONENT_ADDED,
        data: { componentType: draggedComponent, position: { x, y } },
      });

      if (circuitComplete && !isComplete) {
        onEvent({
          type: ELECTRIC_CIRCUITS_EVENTS.CIRCUIT_COMPLETE,
          data: {},
        });
      }

      setDraggedComponent(null);
      setDragPosition(null);
    },
    [draggedComponent, components, isComplete, onStateChange, onEvent]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedComponent(null);
    setDragPosition(null);
  }, []);

  // ── Component removal ─────────────────────────────────────

  const handleRemoveComponent = useCallback(
    (id: string) => {
      const updatedComponents = components.filter((c) => c.id !== id);
      // Remove connections to this component
      updatedComponents.forEach((comp) => {
        comp.connections = comp.connections.filter((connId) => connId !== id);
      });

      const circuitComplete = checkCircuitComplete(updatedComponents);

      onStateChange({
        components: updatedComponents,
        isComplete: circuitComplete,
        currentFlow: circuitComplete,
      });

      onEvent({
        type: ELECTRIC_CIRCUITS_EVENTS.COMPONENT_REMOVED,
        data: { componentId: id },
      });

      if (!circuitComplete && isComplete) {
        onEvent({
          type: ELECTRIC_CIRCUITS_EVENTS.CIRCUIT_BROKEN,
          data: {},
        });
      }
    },
    [components, isComplete, onStateChange, onEvent]
  );

  // ── macOS dock hover effect state ────────────────────
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate scale for each dock icon based on distance from hovered icon
  const getDockIconScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 2.0; // Hovered icon - 2x size
    if (distance === 1) return 1.5; // Adjacent icons
    if (distance === 2) return 1.2; // Second-level neighbors
    return 1; // Rest stay normal
  };

  // ── Render grid dots ──────────────────────────────────────

  const gridDots = useMemo(() => {
    const dots = [];
    for (let y = 0; y < WORKSPACE_HEIGHT / GRID_SIZE; y++) {
      for (let x = 0; x < WORKSPACE_WIDTH / GRID_SIZE; x++) {
        dots.push(
          <div
            key={`${x}-${y}`}
            className="absolute w-1 h-1 rounded-full bg-ink/10"
            style={{
              left: x * GRID_SIZE,
              top: y * GRID_SIZE,
            }}
          />
        );
      }
    }
    return dots;
  }, []);

  // ── Render electricity particles ──────────────────────────

  const electricityParticles = useMemo(() => {
    if (!currentFlow) return null;

    // Find battery
    const battery = components.find((c) => c.type === "battery");
    if (!battery) return null;

    // Render particles along connections
    return battery.connections.map((connId, idx) => {
      const target = components.find((c) => c.id === connId);
      if (!target) return null;

      const startX = battery.position.x * GRID_SIZE;
      const startY = battery.position.y * GRID_SIZE;
      const endX = target.position.x * GRID_SIZE;
      const endY = target.position.y * GRID_SIZE;

      return (
        <motion.img
          key={`particle-${idx}`}
          src="/assets/spark.png"
          alt=""
          className="absolute w-4 h-4 object-contain"
          style={{
            left: startX - 8,
            top: startY - 8,
            filter: "drop-shadow(0 0 8px rgba(250, 204, 21, 0.8))",
          }}
          animate={{
            left: [startX - 8, endX - 8, startX - 8],
            top: [startY - 8, endY - 8, startY - 8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            delay: idx * 0.3,
          }}
        />
      );
    });
  }, [currentFlow, components]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full select-none gap-6">
      {/* ── Workspace ───────────────────────────────────── */}
      <div className="relative bg-paper/50 rounded-2xl p-6">
        {/* Circuit status indicator - only show when complete */}
        {isComplete && (
          <div className="absolute top-6 right-6 z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-4 py-2 border-3 border-ink rounded-full bg-green-100 shadow-chunky-sm"
            >
              <span className="text-xl">✅</span>
              <span className="font-display text-sm font-bold text-ink">
                Circuit Complete!
              </span>
            </motion.div>
          </div>
        )}

        <div
          ref={workspaceRef}
          className="border-4 border-ink rounded-lg bg-white shadow-chunky overflow-hidden"
          onDragOver={(e) => {
            e.preventDefault();
            handleDragMove(e);
          }}
          onDrop={handleDrop}
          style={{
            width: WORKSPACE_WIDTH,
            height: WORKSPACE_HEIGHT,
          }}
        >
          {/* Grid dots */}
          {gridDots}

          {/* Electricity particles */}
          {electricityParticles}

          {/* Placed components */}
          {components.map((comp) => {
            const isLightbulb = comp.type === "lightbulb";
            const isPowered = currentFlow && isLightbulb;

            return (
              <motion.div
                key={comp.id}
                className="absolute flex items-center justify-center cursor-pointer group"
                style={{
                  left: comp.position.x * GRID_SIZE - 20,
                  top: comp.position.y * GRID_SIZE - 20,
                  width: 40,
                  height: 40,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={{ scale: 1.1 }}
                onClick={() => handleRemoveComponent(comp.id)}
              >
                {/* Component icon */}
                <div
                  className="relative"
                  style={{
                    filter: isPowered
                      ? "drop-shadow(0 0 12px rgba(250, 204, 21, 0.9))"
                      : "none",
                  }}
                >
                  <img
                    src={COMPONENT_ICONS[comp.type]}
                    alt=""
                    className="w-10 h-10 object-contain"
                  />
                  {isPowered && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-yellow-300/30"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                </div>

                {/* Remove hint */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-body text-ink/50 whitespace-nowrap">
                    Click to remove
                  </span>
                </div>

                {/* Connection indicators */}
                {comp.connections.map((connId) => {
                  const target = components.find((c) => c.id === connId);
                  if (!target) return null;

                  const dx = target.position.x - comp.position.x;
                  const dy = target.position.y - comp.position.y;
                  const isHorizontal = dy === 0;
                  const isPositive = dx > 0 || dy > 0;

                  return (
                    <div
                      key={connId}
                      className="absolute"
                      style={{
                        width: isHorizontal ? GRID_SIZE : 2,
                        height: isHorizontal ? 2 : GRID_SIZE,
                        backgroundColor: currentFlow ? "#EF4444" : "#94A3B8",
                        left: isHorizontal ? (isPositive ? 20 : -GRID_SIZE + 20) : 19,
                        top: isHorizontal ? 19 : (isPositive ? 20 : -GRID_SIZE + 20),
                      }}
                    />
                  );
                })}
              </motion.div>
            );
          })}

          {/* Drag preview */}
          {draggedComponent && dragPosition && (
            <div
              className="absolute pointer-events-none opacity-50"
              style={{
                left: snapToGrid(dragPosition.x) * GRID_SIZE - 20,
                top: snapToGrid(dragPosition.y) * GRID_SIZE - 20,
                width: 40,
                height: 40,
              }}
            >
              <img
                src={COMPONENT_ICONS[draggedComponent]}
                alt=""
                className="w-10 h-10 object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Dock (macOS-style) ──────────────────────── */}
      <div className="flex justify-center items-end">
        <div className="flex items-end gap-2 px-4 py-3 border-4 border-ink rounded-2xl bg-paper/80 backdrop-blur-sm shadow-chunky">
          {(Object.keys(COMPONENT_ICONS) as ComponentType[]).map((type, index) => {
            const scale = getDockIconScale(index);

            return (
              <motion.div
                key={type}
                draggable
                onDragStart={() => handleDragStart(type)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex flex-col items-center cursor-grab active:cursor-grabbing"
                animate={{
                  scale: scale,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                style={{
                  transformOrigin: "bottom center",
                  width: 48,
                  height: 48,
                }}
              >
                <div
                  className="relative flex items-center justify-center w-full h-full"
                >
                  <img
                    src={COMPONENT_ICONS[type]}
                    alt={COMPONENT_LABELS[type]}
                    className="w-full h-full object-contain pointer-events-none"
                    style={{
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
