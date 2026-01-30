import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/polymarket': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/polymarket/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Accept', 'application/json');
          });
        },
      },
      '/api/news': {
        target: 'https://news.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/news/, '/rss'),
      },
    },
  },
})
