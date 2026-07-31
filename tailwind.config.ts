import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#476649',
        'primary-container': '#7d9e7e',
        'on-primary': '#ffffff',
        'on-primary-container': '#17341c',
        secondary: '#8f4c27',
        'secondary-container': '#fea77a',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#773a16',
        tertiary: '#894e46',
        'tertiary-container': '#c9847a',
        'tertiary-fixed': '#ffdad5',
        surface: '#f8f9ff',
        'surface-container': '#e6eeff',
        'surface-container-low': '#eff4ff',
        'surface-container-high': '#dce9ff',
        'surface-container-highest': '#d7e3f9',
        'surface-container-lowest': '#ffffff',
        'on-surface': '#101c2c',
        'on-surface-variant': '#424841',
        outline: '#737971',
        'outline-variant': '#c2c8bf',
        background: '#f8f9ff',
        cream: '#FFFBF5',
      },
      borderRadius: {
        card: '24px',
      },
      spacing: {
        gutter: '16px',
        'container-margin': '20px',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 25px -5px rgba(30, 42, 58, 0.08), 0 8px 10px -6px rgba(30, 42, 58, 0.05)',
        organic: '0 10px 30px -10px rgba(30, 42, 58, 0.08)',
      },
      maxWidth: {
        app: '42rem',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        yds: {
          primary: '#476649',
          'primary-content': '#ffffff',
          secondary: '#8f4c27',
          'secondary-content': '#ffffff',
          accent: '#7d9e7e',
          neutral: '#424841',
          'base-100': '#f8f9ff',
          'base-200': '#eff4ff',
          'base-300': '#d7e3f9',
          'base-content': '#101c2c',
          info: '#3ABFF8',
          success: '#476649',
          warning: '#fea77a',
          error: '#ba1a1a',
        },
      },
    ],
  },
};

export default config;
