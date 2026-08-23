import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // backend は別ポートで動く。開発中は /api をそちらへ流す。
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
