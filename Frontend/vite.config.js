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

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  return {
  plugins: [
    react(),

    VitePWA({
      // ─── Register strategy ─────────────────────────────────────────────
      registerType: isDev ? 'prompt' : 'autoUpdate',
      injectRegister: false,

      // Dev: lightweight SW (manifest + SPA shell only — no Vite asset caching)
      devOptions: {
        enabled: true,
        type: 'classic',
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
        navigateFallback: '/index.html',

        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/@/,               // Vite internals — never intercept in dev
          /^\/src\//,
          /^\/node_modules\//,
          /\.(png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf|eot)$/,
        ],

        // Dev: API-only rule — caching JS/CSS/Vite modules caused OOM crashes
        runtimeCaching: isDev
          ? [
              {
                urlPattern: /^.*\/api\/.*/i,
                handler: 'NetworkOnly',
                options: { cacheName: 'api-no-cache' },
              },
            ]
          : [
              {
                urlPattern: /^.*\/api\/.*/i,
                handler: 'NetworkOnly',
                options: { cacheName: 'api-no-cache' },
              },
              {
                urlPattern: /\.(?:js|css)$/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'static-assets',
                  expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                urlPattern: /\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'image-cache',
                  expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'google-fonts',
                  expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],

        globPatterns: isDev ? undefined : ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        globIgnores: isDev ? undefined : [
          '**/Images/**/*',
          '**/*.map',
        ],

        skipWaiting: !isDev,
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
}
})
