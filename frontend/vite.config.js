import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'Box WMS',
        short_name: 'Box WMS',
        description: 'Box Warehouse Management System',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/box-wms-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/box-wms-180.png',
            sizes: '180x180',
            type: 'image/png',
          }
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: true,
    proxy: {
      '/api': {
        target: 'http://192.168.254.126:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})