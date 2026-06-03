import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  base: (globalThis as any).process?.env?.VITE_BASE ?? '/song-steward/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
