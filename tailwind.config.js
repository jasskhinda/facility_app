/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand color
        'primary': '#7CCFD0',
        'primary-hover': '#60BFC0',
        
        // UI Colors
        'background': '#FFFFFF',
        'foreground': '#1A1A1A',
        'card-bg': '#F8F9FA',
        'border': '#E0E0E0',
        
        // Button colors
        'btn-primary': '#7CCFD0',
        'btn-success': '#22C55E',
        'btn-danger': '#EF4444',
        'btn-info': '#3B82F6',
        'btn-warning': '#F59E0B',
        'btn-secondary': '#6B7280',
      },
    },
  },
  plugins: [],
};