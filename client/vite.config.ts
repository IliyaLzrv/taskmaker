import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    open: '/login',                             // <— open login on start
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } }
  },
})
