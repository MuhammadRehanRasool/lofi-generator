/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind v4 auto-detects content, but explicit paths can help
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Theme is defined in index.css using @theme
}
