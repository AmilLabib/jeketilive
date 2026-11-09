import { useEffect, useState } from 'react'
import { connectChat, type ChatMessage, type ChatStatus } from './chat'
import type { LiveStream } from './types'

const MAX_MESSAGES = 150

/** Comment feed for a stream; shared by the side panel and the picture-in-picture overlay. */
export function useChat(stream: LiveStream | undefined) {
  // Messages are tagged with their session so a new broadcast starts empty.
  const [feed, setFeed] = useState<{ session?: string; list: ChatMessage[] }>({ list: [] })
  const [status, setStatus] = useState<ChatStatus>('connecting')

  // Depend on primitives so the 30s live-list refresh (new stream object) doesn't reconnect.
  const { sessionId, platform, roomId, showroomChatKey, idnUsername } = stream ?? {}
  useEffect(() => {
    if (!platform || !roomId) return
    return connectChat(
      { platform, roomId, showroomChatKey, idnUsername },
      (m) =>
        setFeed((prev) => ({
          session: sessionId,
          list: prev.session === sessionId ? [...prev.list.slice(-(MAX_MESSAGES - 1)), m] : [m],
        })),
      setStatus,
    )
  }, [sessionId, platform, roomId, showroomChatKey, idnUsername])

  return { messages: feed.session === sessionId ? feed.list : [], status }
}
