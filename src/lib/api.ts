import { useQuery } from '@tanstack/react-query'
import { members } from '../data/members'
import { supabase } from './supabase'
import type { LivePayload, LiveSession, LiveStream, Platform } from './types'

export const memberBySlug = new Map(members.map((m) => [m.slug, m]))

export function useLives() {
  return useQuery({
    queryKey: ['lives'],
    queryFn: async (): Promise<LivePayload> => {
      const res = await fetch('/api/lives')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 30_000,
  })
}

export function useStream(platform: string | undefined, roomId: string | undefined) {
  const lives = useLives()
  const stream = lives.data?.streams.find((s) => s.platform === platform && s.roomId === roomId)
  return { ...lives, stream }
}

/** Showroom HLS allows CORS; IDN needs its master playlist proxied (worker/hls-proxy.ts). */
export function playableUrl(stream: LiveStream) {
  if (stream.platform === 'showroom') return stream.playbackUrl
  const proxy = import.meta.env.VITE_HLS_PROXY_URL || '/hls'
  return `${proxy}?url=${encodeURIComponent(stream.playbackUrl)}`
}

interface HistoryFilter {
  platform?: Platform
  memberSlug?: string
  limit?: number
}

export function useHistory({ platform, memberSlug, limit = 60 }: HistoryFilter = {}) {
  return useQuery({
    queryKey: ['history', platform, memberSlug, limit],
    enabled: Boolean(supabase),
    queryFn: async () => {
      let query = supabase!
        .from('live_sessions')
        .select('*')
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(limit)
      if (platform) query = query.eq('platform', platform)
      if (memberSlug) query = query.eq('member_slug', memberSlug)
      const { data, error } = await query
      if (error) throw error
      return data as LiveSession[]
    },
  })
}
