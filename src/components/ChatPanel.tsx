import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { connectChat, type ChatMessage, type ChatStatus } from '../lib/chat'
import type { LiveStream } from '../lib/types'

const MAX_MESSAGES = 150

const STATUS: Record<ChatStatus, { label: string; color: string }> = {
  connecting: { label: 'Menghubungkan...', color: 'bg-amber-400' },
  live: { label: 'Tersambung', color: 'bg-emerald-400' },
  error: { label: 'Komentar tidak tersedia', color: 'bg-red-500' },
}

export default function ChatPanel({ stream, className = '' }: { stream: LiveStream; className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('connecting')
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  // Depend on primitives so the 30s live-list refresh (new stream object) doesn't reconnect.
  // Parents key this component by sessionId, so a new broadcast starts with empty messages.
  const { platform, roomId, showroomChatKey, idnUsername } = stream
  useEffect(
    () =>
      connectChat(
        { platform, roomId, showroomChatKey, idnUsername },
        (m) => setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), m]),
        setStatus,
      ),
    [platform, roomId, showroomChatKey, idnUsername],
  )

  useEffect(() => {
    const list = listRef.current
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight
  }, [messages])

  return (
    <aside className={`flex flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-line ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-semibold">Komentar live</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`size-2 rounded-full ${STATUS[status].color}`} />
          {STATUS[status].label}
        </span>
      </div>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
        className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted">Belum ada komentar. Tunggu sebentar ya.</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2.5"
            >
              {m.avatar ? (
                <img src={m.avatar} alt="" loading="lazy" className="size-7 shrink-0 rounded-full bg-surface-2 object-cover" />
              ) : (
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs text-muted">
                  {m.name[0]}
                </span>
              )}
              <p className="min-w-0 wrap-break-word text-sm leading-snug">
                <span className="mr-1.5 font-semibold text-brand-2">{m.name}</span>
                <span className="text-text/90">{m.text}</span>
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  )
}
