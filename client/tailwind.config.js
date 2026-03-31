/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#075e54",
        secondary: "#128c7e",
        accent: "#25d366",
        chatBackground: "#e5ddd5",
      }
    },
  },
  plugins: [],
}
