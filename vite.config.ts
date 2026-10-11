import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Vercel served at root, GitHub Pages under /football-career-sim/
  base: process.env.VERCEL ? '/' : '/football-career-sim/',
})
