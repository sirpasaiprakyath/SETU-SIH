/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          primary: "#1B2A4A",
          deep: "#223759",
          darker: "#121D34",
          light: "#2B3F68"
        },
        khaki: {
          DEFAULT: "#6B7355",
          light: "#828C6A",
          dark: "#525941"
        },
        gold: {
          DEFAULT: "#C9A227",
          light: "#DFBA3E",
          dark: "#A6841B"
        },
        neutral: {
          card: "#F2F4F7",
          border: "#E2E6EC",
          hover: "#E8ECF2"
        },
        text: {
          primary: "#1F2937",
          muted: "#5B6472",
          light: "#F9FAFB"
        }
      },
      fontFamily: {
        serif: ["'Noto Sans'", "'Noto Sans Devanagari'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        sans: ["'Noto Sans'", "'Noto Sans Devanagari'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "3px",
        lg: "4px",
        xl: "4px",
        "2xl": "4px",
        "3xl": "4px",
        full: "9999px",
        none: "0px"
      },
      boxShadow: {
        none: "none",
        DEFAULT: "none",
        sm: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
        "2xs": "none",
        "xs": "none",
        inner: "none"
      }
    },
  },
  plugins: [],
}
