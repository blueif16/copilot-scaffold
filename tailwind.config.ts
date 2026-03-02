import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./framework/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F2",
        ink: "#1A1A1A",
        playful: {
          sky: "#7EC8E3",
          peach: "#FFB088",
          mustard: "#F4D35E",
          sage: "#B5D99C",
          lavender: "#C3AED6",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        chunky: "4px 4px 0px 0px #1A1A1A",
        "chunky-sm": "2px 2px 0px 0px #1A1A1A",
        "chunky-lg": "6px 6px 0px 0px #1A1A1A",
        "chunky-hover": "6px 6px 0px 0px #1A1A1A",
      },
      borderRadius: {
        chunky: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
