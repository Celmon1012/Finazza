import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        line: "#2f3336",
        muted: "#71767b",
        orange: "#ff7a18",
        gold: "#ffc14d",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,193,77,0.25), 0 10px 40px rgba(255,122,24,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
