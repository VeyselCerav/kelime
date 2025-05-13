import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',
        secondary: '#06B6D4',
      }
    }
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [{
      light: {
        "primary": "#4F46E5",
        "primary-content": "#ffffff",
        "secondary": "#06B6D4",
        "secondary-content": "#ffffff",
        "accent": "#37CDBE",
        "neutral": "#6B7280",
        "base-100": "#ffffff",
        "base-200": "#F9FAFB",
        "base-300": "#F3F4F6",
        "base-content": "#1F2937",
        "info": "#3ABFF8",
        "success": "#36D399",
        "warning": "#FBBD23",
        "error": "#F87272"
      }
    }],
  },
}
export default config 