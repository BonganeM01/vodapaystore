// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // When deployed, the app is served from the root of your domain
  base: '/',
  build: {
    outDir: 'dist',
    // Ensure assets are inlined or kept small for fast WebView loading
    assetsInlineLimit: 4096,
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      'nonplanetary-travelled-dewitt.ngrok-free.dev',
    ],
  },
})
