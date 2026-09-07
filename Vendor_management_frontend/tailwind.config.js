/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Genericart brand palette, from the official UI reference image:
        //   Primary:       #1E88E5 (kept exact at the 600 step below)
        //   Primary Light: #64B5F6 (kept exact at the 400 step below)
        //   Dark Text:     #212121 (kept exact as `ink.DEFAULT` below)
        //   Green:         #43A047 (kept exact as `success.DEFAULT` below)
        //   Background:    #F5F7FA (kept exact as `surface.muted` below)
        // `primary` is an alias of `brand` so existing UI components (Button, etc.)
        // pick up the brand color automatically.
        brand: {
          50: '#e8f1fc',
          100: '#cce3fa',
          200: '#99c7f5',
          300: '#7ebef7',
          400: '#64b5f6',
          500: '#42a5f0',
          600: '#1e88e5',
          700: '#1668b3',
          800: '#114e87',
          900: '#0c3a64',
        },
        primary: {
          50: '#e8f1fc',
          100: '#cce3fa',
          200: '#99c7f5',
          300: '#7ebef7',
          400: '#64b5f6',
          500: '#42a5f0',
          600: '#1e88e5',
          700: '#1668b3',
          800: '#114e87',
          900: '#0c3a64',
        },
        success: {
          DEFAULT: '#43a047',
          50: '#e8f5e9',
          500: '#43a047',
          600: '#388e3c',
        },
        // Exact dark text color from the logo wordmark.
        ink: {
          DEFAULT: '#212121',
          muted: '#5f5f5f',
        },
        surface: {
          light: '#ffffff',
          muted: '#f5f7fa',
          dark: '#0f1115',
        },
      },
    },
  },
  plugins: [],
};
