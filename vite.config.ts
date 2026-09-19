/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000'
  const proxy = Object.fromEntries(
    ['/v1', '/sys', '/health', '/openapi.json'].map((p) => [p, { target, changeOrigin: true }]),
  )
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: { port: 5178, proxy },
    build: { sourcemap: false },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/test/setup.ts'],
      css: false,
      exclude: ['e2e/**', 'node_modules/**'],
    },
  }
})
