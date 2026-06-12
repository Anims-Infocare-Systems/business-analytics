import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/

/** Where Node forwards `/api/*` — must match `python manage.py runserver …` host:port */
function viteApiProxy(mode) {
  const env = loadEnv(mode, process.cwd(), '')
  let target =
    env.VITE_DEV_BACKEND_URL ||
    env.VITE_BACKEND_PROXY_TARGET ||
    'http://localhost:8000'
  target = String(target).trim().replace(/\/+$/, '').replace(/\/api\/?$/i, '')
  if (!/^https?:\/\//i.test(target)) target = `http://${target}`

  return {
    '/api': {
      target,
      changeOrigin: true,
      secure: false,
      // Charts hit SQL Server via Django — queries can exceed default proxy timeouts → 504/502-looking errors.
      timeout: 300_000,
      proxyTimeout: 300_000,
      configure(proxy) {
        proxy.on('error', (err) => console.error('[vite proxy /api]', err.message))
      },
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),

    VitePWA({
      // ─── Register strategy ─────────────────────────────────────────────
      // 'autoUpdate': silently installs new SW & reloads on next navigation
      registerType: 'autoUpdate',

      // ─── Dev options ────────────────────────────────────────────────────
      // SW only registers in dev when accessed via `localhost` (secure context).
      // On a LAN IP (192.168.x.x) over HTTP, browsers block SW by design —
      // the app still works normally on mobile, just without offline caching.
      // Full PWA runs on production where real HTTPS is present.
      devOptions: {
        enabled: true,
        type: 'classic',           // Workbox SWs must be classic scripts, not ESM
        navigateFallback: 'index.html',
      },

      // ─── Include only small assets in precache ──────────────────────────
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
        // NOTE: Large images (logohead.png, LOGIN image, ig.png) are
        // intentionally excluded from precache (> 2 MB). They are cached
        // lazily at runtime by the CacheFirst image rule below.
      ],

      // ─── Web App Manifest ───────────────────────────────────────────────
      manifest: {
        name: 'Anims Business Analytics',
        short_name: 'Anims BA',
        description: 'Enterprise analytics and ERP dashboard by Anims Infocare Systems.',
        theme_color: '#0f0c29',
        background_color: '#0f0d22',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        prefer_related_applications: false,
      },

      // ─── Workbox runtime caching ────────────────────────────────────────
      workbox: {
        // SPA routing: all navigations fall back to index.html
        navigateFallback: '/index.html',

        // Don't apply navigateFallback to API calls or non-HTML assets
        navigateFallbackDenylist: [
          /^\/api\//,           // Django REST API — never intercept
          /\.(png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf|eot)$/,
        ],

        // ── Runtime caching rules ──────────────────────────────────────
        runtimeCaching: [
          // API calls → always fetch live, never cache
          {
            urlPattern: /^.*\/api\/.*/i,
            handler: 'NetworkOnly',
            options: { cacheName: 'api-no-cache' },
          },

          // Static assets (JS, CSS chunks) → CacheFirst, long TTL
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // Images → CacheFirst, 30 days
          {
            urlPattern: /\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // Google Fonts → StaleWhileRevalidate
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // All other network requests → NetworkFirst with fallback
          {
            urlPattern: /^https?:\/\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'network-first-fallback',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

        // Precache all Vite build output (skip large /Images/ directory)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        globIgnores: [
          '**/Images/**/*',     // large product/logo images — cached lazily at runtime
          '**/*.map',           // source maps — not needed in SW
        ],

        // Skip waiting — apply new SW immediately
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],

  server: {
    // HTTP only — keeps mobile LAN access working.
    // basicSsl / https:true was removed because self-signed certs
    // hard-block on Android & iOS without a way to "proceed anyway".
    proxy: { ...viteApiProxy(mode) },
  },
  preview: {
    proxy: { ...viteApiProxy(mode) },
  },
}))
