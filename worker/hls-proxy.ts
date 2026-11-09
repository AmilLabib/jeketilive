// Cloudflare Worker: proxies the IDN Live (AWS IVS) master playlist, the only part sent
// without CORS headers. Variant playlists and segments allow CORS, so the master's URIs
// are made absolute and the browser fetches them directly.
// Usage: GET /?url=<encoded master playlist url>
//
// IDN region-locks some streams (403 content_geoblocked, checked on the master only). Asian
// egress passes, but Cloudflare often runs Workers for Telkomsel viewers in the US or Europe,
// and the result sticks per connection. So the fetch is done by a Durable Object pinned to
// Asia-Pacific via locationHint (measured: SIN/ICN/NRT/KIX all pass, from any entry colo).
const ALLOWED_HOST = /(^|\.)live-video\.net$/

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
}

interface Env {
  MASTER_FETCHER: {
    idFromName(name: string): unknown
    get(id: unknown, options?: { locationHint?: string }): { fetch(request: Request): Promise<Response> }
  }
  /** Secrets for the history snapshot cron (wrangler secret put). */
  CRON_SECRET: string
  SITE_URL: string
}

function absolutizePlaylist(text: string, base: URL) {
  const absolute = (uri: string) => new URL(uri, base).href
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line
      if (trimmed.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${absolute(uri)}"`)
      return absolute(trimmed)
    })
    .join('\n')
}

/** The actual proxy. Runs inside the Durable Object in production and directly in `npm run dev`. */
export async function handleMaster(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })

  let target: URL
  try {
    target = new URL(new URL(request.url).searchParams.get('url') ?? '')
  } catch {
    return new Response('Parameter url tidak valid', { status: 400, headers: CORS })
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOST.test(target.hostname)) {
    return new Response('Host tidak diizinkan', { status: 403, headers: CORS })
  }

  const upstream = await fetch(target)
  const headers = new Headers({ ...CORS, 'cache-control': 'no-cache' })
  headers.set('content-type', upstream.headers.get('content-type') ?? 'application/vnd.apple.mpegurl')

  const body = await upstream.text()
  return new Response(upstream.ok ? absolutizePlaylist(body, target) : body, { status: upstream.status, headers })
}

export class MasterFetcher {
  fetch(request: Request) {
    return handleMaster(request)
  }
}

export default {
  fetch(request: Request, env: Env) {
    const ns = env.MASTER_FETCHER
    return ns.get(ns.idFromName('apac'), { locationHint: 'apac' }).fetch(request)
  },

  // Live history: calls api/cron/snapshot every 5 minutes (see [triggers] in wrangler.toml).
  // GitHub Actions' schedule was too unreliable for this (runs only every few hours).
  async scheduled(_event: unknown, env: Env) {
    const res = await fetch(`${env.SITE_URL}/api/cron/snapshot`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })
    const body = await res.text()
    if (!res.ok) throw new Error(`Snapshot gagal (HTTP ${res.status}): ${body}`)
    console.log(body)
  },
}
