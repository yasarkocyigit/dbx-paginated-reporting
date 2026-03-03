import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../back-end/static'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            '@codemirror/commands',
            '@codemirror/lang-html',
            '@codemirror/state',
            '@codemirror/theme-one-dark',
            '@codemirror/view',
            'codemirror',
          ],
          chartjs: ['chart.js'],
          mustache: ['mustache'],
          dompurify: ['dompurify'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
