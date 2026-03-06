import type { TopicMeta } from "@/lib/types";

export const TOPICS: TopicMeta[] = [
  {
    id: "changing-states",
    title: "Changing States",
    description:
      "Heat it up, cool it down — watch tiny particles dance between solid, liquid, and gas!",
    ageRange: [6, 8],
    level: 1,
    route: "/topics/changing-states",
    color: "playful-sky",
  },
  {
    id: "electric-circuits",
    title: "Electric Circuits",
    description:
      "Build circuits, flip switches, and light up bulbs — discover how electricity flows!",
    ageRange: [9, 10],
    level: 2,
    route: "/topics/electric-circuits",
    color: "playful-mustard",
  },
  {
    id: "genetics-basics",
    title: "Genetics Basics",
    description:
      "Mix genes, predict traits, and breed creatures — explore how inheritance works!",
    ageRange: [11, 12],
    level: 3,
    route: "/topics/genetics-basics",
    color: "playful-sage",
  },
];
