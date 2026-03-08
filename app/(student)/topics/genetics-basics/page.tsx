export const dynamic = 'force-dynamic';

"use client";

import { TopicPageLayout } from "@/framework/TopicPageLayout";
import { GeneticsBasicsSimulation } from "@/components/simulations/GeneticsBasicsSimulation";
import { geneticsBasicsConfig } from "@/lib/config/topics/genetics-basics";

export default function GeneticsBasicsPage() {
  return (
    <TopicPageLayout
      topicSlug="genetics-basics"
      title="Genetics Basics"
      loadingMessage="Setting up the genetics lab…"
      config={geneticsBasicsConfig}
      SimulationComponent={GeneticsBasicsSimulation}
    />
  );
}
