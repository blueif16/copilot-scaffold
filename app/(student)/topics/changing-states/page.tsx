"use client";

import { TopicPageLayout } from "@/framework/TopicPageLayout";
import { ChangingStatesSimulation } from "@/components/simulations/ChangingStatesSimulation";
import { changingStatesConfig } from "@/lib/topics/changing-states/config";

export default function ChangingStatesPage() {
  return (
    <TopicPageLayout
      topicSlug="changing-states"
      title="Changing States"
      loadingMessage="Setting up the science lab…"
      config={changingStatesConfig}
      SimulationComponent={ChangingStatesSimulation}
    />
  );
}
