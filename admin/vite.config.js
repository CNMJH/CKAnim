import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    host: '0.0.0.0',
    allowedHosts: ['anick.cn', 'www.anick.cn', 'admin.anick.cn', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
