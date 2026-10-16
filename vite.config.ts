import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: funciona a GitHub Pages (/<repo>/) i en local
export default defineConfig({
  base: './',
  plugins: [react()],
})
