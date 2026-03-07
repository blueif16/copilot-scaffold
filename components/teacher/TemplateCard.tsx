"use client";

import { motion } from "framer-motion";
import { TemplateCardProps } from "@/lib/types/course-builder";

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <motion.button
      onClick={() => onClick(template)}
      className="card-chunky p-6 text-left hover:scale-105 transition-transform"
      style={{ backgroundColor: template.color }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="text-4xl mb-3">{template.icon}</div>
      <h3 className="font-display text-xl font-bold text-ink mb-2">
        {template.name}
      </h3>
      <p className="text-ink/70 text-sm font-body">
        {template.description}
      </p>
      <div className="mt-4 inline-block px-3 py-1 bg-ink/10 rounded-full text-xs font-medium text-ink">
        {template.format === "lab" ? "Lab Simulation" : "Dialogue"}
      </div>
    </motion.button>
  );
}
