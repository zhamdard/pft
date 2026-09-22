import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base ("") so the built app works from ANY path:
  //   • GitHub Pages subpaths  → https://user.github.io/repo-name/
  //   • a custom domain        → https://pft.example.com/
  //   • a local folder         → file previews
  // With an absolute base of "/", every asset would 404 on GitHub Pages
  // because the app is served from /repo-name/ instead of the domain root.
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
