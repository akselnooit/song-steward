import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Unikalny identyfikator builda. Wstrzykiwany do bundla jako __BUILD_ID__ ORAZ
// zapisywany do dist/version.json. Klient porównuje jedno z drugim, by wykryć,
// że na serwerze leży nowszy build (patrz useVersionCheck).
const buildId = String(Date.now())

// Emituje dist/version.json z tym samym buildId co wkompilowany __BUILD_ID__.
// Plik ląduje w korzeniu dist → serwowany pod ${base}version.json, więc działa
// zarówno dla produkcji (/song-steward/) jak i staging (/song-steward/staging/).
function versionManifest(id: string): Plugin {
  return {
    name: 'ss-version-manifest',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ buildId: id }) })
    },
  }
}

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  base: (globalThis as any).process?.env?.VITE_BASE ?? '/song-steward/',
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    tailwindcss(),
    versionManifest(buildId),
  ],
})
