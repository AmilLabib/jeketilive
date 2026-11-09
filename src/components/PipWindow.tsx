import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { formatNumber } from '../lib/format'
import type { ChatMessage } from '../lib/chat'
import type { LiveStream } from '../lib/types'
import { ChatIcon, EyeIcon } from './icons'

const VISIBLE_COMMENTS = 4

/**
 * Renders into the picture-in-picture window and moves the player's existing <video> into it,
 * so hls.js keeps playing without reloading. The video goes back to the page when this unmounts.
 */
export default function PipWindow({
  win,
  videoRef,
  stream,
  comments,
}: {
  win: Window
  videoRef: RefObject<HTMLVideoElement | null>
  stream: LiveStream
  comments: ChatMessage[]
}) {
  const slotRef = useRef<HTMLDivElement>(null)
  const [showComments, setShowComments] = useState(true)

  useLayoutEffect(() => {
    const video = videoRef.current!
    const home = video.parentElement!
    slotRef.current!.append(video)
    return () => {
      home.prepend(video)
    }
  }, [videoRef])

  // CSS animation, not Framer Motion: the page's requestAnimationFrame stops while its tab is hidden.
  const recent = comments.slice(-VISIBLE_COMMENTS)

  return createPortal(
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <div ref={slotRef} className="size-full" />

      <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/70 to-transparent px-3 pb-6 pt-2 text-xs">
        <span className="size-1.5 shrink-0 rounded-full bg-brand" />
        <span className="truncate font-semibold">{stream.memberName}</span>
        <span className="flex shrink-0 items-center gap-1 text-white/75">
          <EyeIcon width={12} height={12} /> {formatNumber(stream.viewers)}
        </span>
        <button
          onClick={() => setShowComments((v) => !v)}
          className={`ml-auto grid size-7 shrink-0 place-items-center rounded-full ${showComments ? 'bg-brand' : 'bg-white/15 text-white/70'}`}
          aria-label={showComments ? 'Sembunyikan komentar' : 'Tampilkan komentar'}
          title={showComments ? 'Sembunyikan komentar' : 'Tampilkan komentar'}
        >
          <ChatIcon width={14} height={14} />
        </button>
      </div>

      {showComments && (
        <div className="pointer-events-none absolute bottom-2 left-2 flex max-w-[75%] flex-col items-start gap-1">
          {recent.map((m, i) => (
            <p
              key={m.id}
              style={{ opacity: 1 - (recent.length - 1 - i) * 0.15 }}
              className="line-clamp-2 animate-comment-in rounded-xl bg-black/55 px-2 py-1 text-[11px] leading-snug"
            >
              <span className="mr-1 font-semibold text-brand-2">{m.name}</span>
              {m.text}
            </p>
          ))}
        </div>
      )}
    </div>,
    win.document.body,
  )
}
