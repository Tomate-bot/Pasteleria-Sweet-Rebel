import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// El navegador habla solo con este mismo origen; Vite reenvía /api al backend.
// Así el backend NO necesita CORS ni ningún cambio.
const hacia = {
    target: process.env.BACKEND_URL || 'http://localhost:8082',
    changeOrigin: true,
    configure: (p) => p.on('proxyReq', (r) => r.removeHeader('origin')),
  };
const proxy = { '/aviso-privacidad.html': hacia, '/api': hacia };

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  server: { port: 5173, host: true, proxy },
  preview: { port: 4173, host: true, proxy },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Sweet Rebel',
        short_name: 'Sweet Rebel',
        description: 'Catálogo, pedidos y derechos de privacidad de Sweet Rebel.',
        lang: 'es', display: 'standalone', start_url: '.', scope: '.',
        theme_color: '#7a4e33', background_color: '#f6f1ea',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Lectura sin conexión: el catálogo ya consultado se guarda y se muestra si el servidor no responde.
        runtimeCaching: [{
          urlPattern: ({ url, request }) => request.method === 'GET' && /^\/api\/(productos|categorias|reposteros)/.test(url.pathname),
          handler: 'NetworkFirst',
          options: { cacheName: 'api-catalogo', networkTimeoutSeconds: 4, expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 3600 } },
        }], globPatterns: ['**/*.{js,css,html,png,woff2}'], navigateFallbackDenylist: [/^\/api/, /^\/aviso-privacidad/] }, // la API nunca se guarda en caché
    }),
  ],
});
