/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#3b82f6',
        'base-content': '#1f2937',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"],
    darkTheme: "light",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
} 