import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Worker-only imports are not discovered by Vite's initial dependency scan.
  // Optimizing these on the first comparison invalidates its module requests.
  optimizeDeps: { include: ['diff', 'yaml'] },
  build: {
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(?:@codemirror|@lezer)\//.test(id)) return 'yaml-editor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
