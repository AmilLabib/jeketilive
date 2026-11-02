// Cloudflare Worker: proxies the IDN Live (AWS IVS) master playlist, the only part sent
// without CORS headers. Variant playlists and segments allow CORS, so the master's URIs
// are made absolute and the browser fetches them directly.
// Usage: GET /?url=<encoded master playlist url>
//
// Limitation: IDN region-locks some streams to Indonesian IPs (checked on the master only).
// Cloudflare's egress IPs aren't Indonesian, so those return 403 content_geoblocked, which
// we pass through and the player shows a "Tonton di IDN" fallback. Locally, `npm run dev`
// serves this at /hls from your own (Indonesian) connection, so those streams work there.
const ALLOWED_HOST = /(^|\.)live-video\.net$/

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
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

export default {
  async fetch(request: Request): Promise<Response> {
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
  },
}
