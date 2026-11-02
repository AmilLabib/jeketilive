import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { defineConfig, type Plugin } from 'vite'

// Serves api/*.ts and the HLS worker (at /hls) during `npm run dev`, so Vercel/Wrangler CLIs aren't needed locally.
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost:5173')
        let handler: (request: Request) => Promise<Response>
        if (url.pathname.startsWith('/api/')) {
          const mod = await server.ssrLoadModule(`/api/${url.pathname.slice(5)}.ts`).catch(() => null)
          if (!mod?.GET) return next()
          handler = mod.GET
        } else if (url.pathname === '/hls') {
          handler = (await server.ssrLoadModule('/worker/hls-proxy.ts')).default.fetch
        } else {
          return next()
        }

        const headers = new Headers()
        for (const [key, value] of Object.entries(req.headers)) {
          if (typeof value === 'string') headers.set(key, value)
        }
        try {
          const response = await handler(new Request(url, { method: req.method, headers }))
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.config.logger.error(String(error))
          res.statusCode = 500
          res.end('Internal error')
        }
      })
    },
  }
}

// Expose .env to api/* handlers in dev, like Vercel does in prod. Not Vite's loadEnv: it prefers
// values already in process.env, so edits to .env would be ignored after the first start.
if (existsSync('.env')) Object.assign(process.env, parseEnv(readFileSync('.env', 'utf8')))

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
})
