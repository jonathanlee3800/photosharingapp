/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        olive: {
          50: '#F4F7F4',
          100: '#E5EDE7',
          200: '#CADACF',
          300: '#A4BFAD',
          400: '#7B9F89',
          500: '#5A8169',
          600: '#466753',
          700: '#385242',
          800: '#2F4237',
          900: '#27372E',
          950: '#141E19',
        },
        cream: {
          50: '#FAF8F5',
          100: '#F5F1EB',
          200: '#ECE5DB',
          300: '#DFD5C5',
          400: '#CCBDA7',
          500: '#B8A389',
        },
      },
      animation: {
        rise: 'riseUp 2.5s ease-out forwards',
      },
      keyframes: {
        riseUp: {
          '0%': { transform: 'translateY(0) scale(0.85)', opacity: '0' },
          '20%': { opacity: '1', transform: 'translateY(-20px) scale(1.05)' },
          '100%': { transform: 'translateY(-160px) scale(1.25)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
