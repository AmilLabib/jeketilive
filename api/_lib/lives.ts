import { members } from '../../src/data/members.js'
import type { LivePayload, LiveStream, Member, Platform } from '../../src/lib/types.js'

const byShowroomId = new Map(members.filter((m) => m.showroomId).map((m) => [m.showroomId, m]))
const byIdnId = new Map(members.filter((m) => m.idnId).map((m) => [m.idnId, m]))

const IDN_QUERY =
  'query { searchLivestream(query: "", limit: 500) { result { slug title image_url view_count playback_url status live_at end_at creator { uuid username } } } }'

// IDN often returns status null for streams that are live, so only treat explicit end markers as offline.
const ENDED_STATUSES = new Set(['end', 'ended', 'offline'])

const toIso = (seconds: number | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null)

interface ShowroomLive {
  live_id: number
  room_id: number
  room_url_key: string
  started_at: number
  view_num: number
  telop: string | null
  image: string
  bcsvr_key: string
  streaming_url_list?: { type: string; url: string }[]
}

async function showroomLives(): Promise<LiveStream[]> {
  const res = await fetch('https://www.showroom-live.com/api/live/onlives')
  if (!res.ok) throw new Error(`Showroom HTTP ${res.status}`)
  const json = (await res.json()) as { onlives: { lives: ShowroomLive[] }[] }

  const seen = new Set<number>()
  const streams: LiveStream[] = []
  for (const live of json.onlives.flatMap((group) => group.lives)) {
    const member = byShowroomId.get(live.room_id)
    if (!member || seen.has(live.room_id)) continue
    seen.add(live.room_id)

    const urls = live.streaming_url_list ?? []
    const hls = urls.find((u) => u.type === 'hls_all') ?? urls.find((u) => u.type === 'hls')
    if (!hls) continue

    streams.push({
      platform: 'showroom',
      roomId: String(live.room_id),
      sessionId: `showroom:${live.live_id}`,
      memberSlug: member.slug,
      memberName: member.nickname,
      title: live.telop?.trim() || 'Showroom Live',
      startedAt: toIso(live.started_at),
      viewers: live.view_num ?? 0,
      thumbnail: live.image,
      playbackUrl: hls.url,
      roomUrl: `https://www.showroom-live.com/r/${live.room_url_key}`,
      showroomChatKey: live.bcsvr_key,
    })
  }
  return streams
}

interface IdnLive {
  slug: string
  title: string | null
  image_url: string
  view_count: number
  playback_url: string | null
  status: string | null
  live_at: string | null
  end_at: string | null
  creator: { uuid: string; username: string }
}

async function idnLives(): Promise<LiveStream[]> {
  const res = await fetch('https://api.idn.app/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: IDN_QUERY }),
  })
  if (!res.ok) throw new Error(`IDN HTTP ${res.status}`)
  const json = (await res.json()) as { data?: { searchLivestream?: { result: IdnLive[] } } }

  const streams: LiveStream[] = []
  for (const live of json.data?.searchLivestream?.result ?? []) {
    const member: Member | undefined = byIdnId.get(live.creator.uuid)
    const ended = live.end_at || ENDED_STATUSES.has(live.status?.toLowerCase() ?? '')
    if (!member || ended || !live.playback_url) continue

    streams.push({
      platform: 'idn',
      roomId: live.slug,
      sessionId: `idn:${live.slug}`,
      memberSlug: member.slug,
      memberName: member.nickname,
      title: live.title?.trim() || 'IDN Live',
      startedAt: live.live_at ? new Date(live.live_at).toISOString() : null,
      viewers: live.view_count ?? 0,
      thumbnail: live.image_url,
      playbackUrl: live.playback_url,
      roomUrl: `https://www.idn.app/${live.creator.username}/live/${live.slug}`,
      idnUsername: live.creator.username,
    })
  }
  return streams
}

export async function fetchLives(): Promise<LivePayload> {
  const [showroom, idn] = await Promise.allSettled([showroomLives(), idnLives()])
  const failed: Platform[] = []
  const streams: LiveStream[] = []

  if (showroom.status === 'fulfilled') streams.push(...showroom.value)
  else failed.push('showroom')
  if (idn.status === 'fulfilled') streams.push(...idn.value)
  else failed.push('idn')

  streams.sort((a, b) => b.viewers - a.viewers)
  return { updatedAt: new Date().toISOString(), streams, failed }
}
