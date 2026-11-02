export type Platform = 'idn' | 'showroom'

export interface Member {
  slug: string
  name: string
  nickname: string
  birthday: string | null
  instagram: string | null
  tiktok: string | null
  twitter: string | null
  showroomKey: string | null
  showroomId: number | null
  idnUsername: string | null
  idnId: string | null
  photo: string | null
}

export interface LiveStream {
  platform: Platform
  /** Showroom room_id or IDN live slug; used in /live/:platform/:roomId. */
  roomId: string
  /** Unique per broadcast; key for live_sessions in Supabase. */
  sessionId: string
  memberSlug: string
  memberName: string
  title: string
  startedAt: string | null
  viewers: number
  thumbnail: string
  playbackUrl: string
  roomUrl: string
  /** Showroom bcsvr_key for the comment socket. IDN chat ids are looked up via /api/idn-chat. */
  showroomChatKey?: string
  idnUsername?: string
}

export interface LivePayload {
  updatedAt: string
  streams: LiveStream[]
  /** Platforms whose upstream request failed this time. */
  failed: Platform[]
}

export interface LiveSession {
  id: string
  platform: Platform
  member_slug: string
  member_name: string
  title: string | null
  thumbnail: string | null
  started_at: string
  last_seen_at: string
  ended_at: string | null
  peak_viewers: number
}
