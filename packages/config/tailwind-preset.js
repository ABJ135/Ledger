/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
        },
        "income-positive": "var(--income-positive)",
        "expense-alert": "var(--expense-alert)",
        warning: "var(--warning)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
        },
        border: "var(--border)",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        modal: "16px",
        card: "16px",
        input: "10px",
        btn: "10px",
        pill: "9999px",
      },
      spacing: {
        "4.5": "18px",
        "18": "72px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,27,25,0.04), 0 4px 12px rgba(28,27,25,0.05)",
        modal: "0 20px 50px rgba(0,0,0,0.18)",
        "modal-dark": "0 20px 50px rgba(0,0,0,0.6)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        standard: "160ms",
      },
    },
  },
  plugins: [],
};
