// Called every 5 minutes by the Cloudflare Worker's cron (worker/hls-proxy.ts scheduled());
// .github/workflows/snapshot.yml is a slower backup. Records each live broadcast
// in Supabase and marks it ended once it disappears from the platform's live list.
import { createClient } from '@supabase/supabase-js'
import type { LiveSession } from '../../src/lib/types.js'
import { fetchLives } from '../_lib/lives.js'

export async function GET(request: Request) {
  const { CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  if (!CRON_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Env CRON_SECRET / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { streams, failed } = await fetchLives()
  const now = new Date().toISOString()

  const open = await db.from('live_sessions').select('*').is('ended_at', null)
  if (open.error) return Response.json({ error: open.error.message }, { status: 500 })
  const existing = new Map((open.data as LiveSession[]).map((row) => [row.id, row]))

  const rows: LiveSession[] = streams.map((s) => {
    const prev = existing.get(s.sessionId)
    return {
      id: s.sessionId,
      platform: s.platform,
      member_slug: s.memberSlug,
      member_name: s.memberName,
      title: s.title,
      thumbnail: s.thumbnail,
      started_at: prev?.started_at ?? s.startedAt ?? now,
      last_seen_at: now,
      ended_at: null,
      peak_viewers: Math.max(prev?.peak_viewers ?? 0, s.viewers),
    }
  })

  // A session is over when it's no longer listed. Skip platforms whose fetch failed,
  // otherwise an upstream hiccup would end every live on that platform.
  const liveIds = new Set(rows.map((r) => r.id))
  const ended = [...existing.values()]
    .filter((row) => !liveIds.has(row.id) && !failed.includes(row.platform))
    .map((row) => ({ ...row, ended_at: row.last_seen_at }))

  const upsert = await db.from('live_sessions').upsert([...rows, ...ended])
  if (upsert.error) return Response.json({ error: upsert.error.message }, { status: 500 })

  return Response.json({ live: rows.length, ended: ended.length, failed })
}
