"use client";

interface ParticleSimProps {
  initial_state?: string;
  widgetId?: string;
}

export default function ParticleSim({ initial_state = "gas" }: ParticleSimProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Particle Simulation</h3>
      <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">
          State: {initial_state}
        </p>
      </div>
    </div>
  );
}
