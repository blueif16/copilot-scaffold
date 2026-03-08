export const dynamic = 'force-dynamic';

"use client";

import { TopicPageLayout } from "@/framework/TopicPageLayout";
import { ElectricCircuitsSimulation } from "@/components/simulations/ElectricCircuitsSimulation";
import { electricCircuitsConfig } from "@/lib/config/topics/electric-circuits";

export default function ElectricCircuitsPage() {
  return (
    <TopicPageLayout
      topicSlug="electric-circuits"
      title="Electric Circuits"
      loadingMessage="Setting up the circuit lab…"
      config={electricCircuitsConfig}
      SimulationComponent={ElectricCircuitsSimulation}
    />
  );
}
