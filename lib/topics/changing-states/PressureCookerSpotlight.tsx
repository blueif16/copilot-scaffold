"use client";

/**
 * Pressure Cooker spotlight content for Changing States topic.
 * Unlocked after discovering all three phases.
 */
export function PressureCookerSpotlight() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍲</span>
        <h3 className="font-display text-base font-bold">Pressure Cooker</h3>
      </div>
      <p className="font-body text-sm text-ink/70 leading-relaxed">
        A pressure cooker traps steam inside a sealed pot. The trapped steam
        builds up pressure, making water boil at a <strong>higher temperature</strong> —
        so food cooks faster!
      </p>
      <p className="font-body text-xs text-ink/50 italic">
        Tap to learn more →
      </p>
    </div>
  );
}
