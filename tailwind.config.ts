import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Embassy Design System (PRD v2.0)
        crimson: {
          DEFAULT: "#8B1A1A",
          50: "#fdf3f3",
          100: "#fce8e8",
          200: "#f9c5c5",
          300: "#f49494",
          400: "#eb5555",
          500: "#dc2626",
          600: "#b91c1c",
          700: "#8B1A1A",
          800: "#7f1d1d",
          900: "#450a0a",
        },
        gold: {
          DEFAULT: "#C9A84C",
          light: "#e8d5a3",
          dark: "#9a7a2f",
        },
        ivory: {
          DEFAULT: "#FAF7F2",
          dark: "#f0ebe1",
        },
        veg: "#2E7D32",
        "non-veg": "#8B1A1A",
        embassy: {
          dark: "#1A1A1A",
          grey: "#777777",
          "grey-light": "#888888",
          "grey-mid": "#666666",
          border: "#D4C4A8",
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Jost", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"],
      },
      backgroundImage: {
        "embassy-gradient":
          "linear-gradient(135deg, #1A0A0A 0%, #2D1515 50%, #1A0A0A 100%)",
        "gold-gradient":
          "linear-gradient(90deg, transparent, #C9A84C, transparent)",
        "ivory-gradient":
          "linear-gradient(180deg, #FAF7F2 0%, #f0ebe1 100%)",
      },
      boxShadow: {
        card: "0 2px 20px rgba(139, 26, 26, 0.08), 0 1px 4px rgba(0,0,0,0.05)",
        "card-hover": "0 8px 40px rgba(139, 26, 26, 0.15), 0 2px 8px rgba(0,0,0,0.08)",
        panel: "0 0 0 1px rgba(201, 168, 76, 0.2), 0 4px 24px rgba(0,0,0,0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideIn: {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(12px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
