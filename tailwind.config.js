/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "Geist Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        ink: {
          50: "#fafaf9",
          100: "#f5f4f2",
          200: "#e7e5e0",
          300: "#d2cfc8",
          400: "#a4a09a",
          500: "#73706b",
          600: "#52504c",
          700: "#3a3835",
          800: "#26241f",
          900: "#161613",
          950: "#0c0c0a",
        },
        accent: {
          DEFAULT: "#a85841",
          muted: "#7a3b2a",
          glow: "#cf7e63",
        },
      },
      maxWidth: {
        prose: "72ch",
      },
    },
  },
  plugins: [],
};
