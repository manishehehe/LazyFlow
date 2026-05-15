import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#10B981",
        ink: "#111827",
        line: "#E5E7EB",
        panel: "#F9FAFB"
      },
      boxShadow: {
        soft: "0 18px 48px rgba(17, 24, 39, 0.08)",
        control: "0 8px 24px rgba(17, 24, 39, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
