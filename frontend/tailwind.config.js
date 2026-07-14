/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        command: "#141B17",   // dark chrome (graphite-green)
        panel: "#1B241E",
        line: "#2C3A31",
        brass: "#C7A44E",
        "brass-bright": "#D8B76A",
        stone: "#F3F3EE",
        ink: "#1A211C",
        muted: "#6B7269",
        complete: "#3F8F5B",
        "complete-soft": "#E7F1EA",
        missing: "#C24A2E",
        "missing-soft": "#F7E9E4",
        amber: "#C98A2B",
      },
      fontFamily: {
        display: ['Oswald', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
