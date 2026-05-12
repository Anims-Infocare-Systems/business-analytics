import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react()],
  server: {
    proxy: { ...viteApiProxy(mode) },
  },
  preview: {
    proxy: { ...viteApiProxy(mode) },
  },
}))
