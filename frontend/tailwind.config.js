/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          sidebar: '#16383a',
          sidebarActive: '#265356',
          primary: '#0f5c5c',
          primaryHover: '#0b4646',
          mint: '#e9f2f0',
          bg: '#f3f5f4',
          scamBg: '#fdede4',
          scamText: '#963b22',
        }
      },
      fontFamily: {
        sans: ['"PingFang TC"', '"Noto Sans TC"', '"Microsoft JhengHei"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
