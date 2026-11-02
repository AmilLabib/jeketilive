import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { memberBySlug } from '../lib/api'
import { formatCompact, formatRelative } from '../lib/format'
import type { LiveStream } from '../lib/types'
import { EyeIcon, GridIcon } from './icons'
import { LiveDot, PlatformBadge } from './ui'

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
}

export default function LiveCard({ stream }: { stream: LiveStream }) {
  const member = memberBySlug.get(stream.memberSlug)
  const watchUrl = `/live/${stream.platform}/${stream.roomId}`

  return (
    <motion.article variants={cardVariants} whileHover={{ y: -6 }} className="group relative">
      <Link
        to={watchUrl}
        className="block overflow-hidden rounded-3xl bg-surface ring-1 ring-line transition-shadow duration-300 group-hover:shadow-[0_20px_60px_-15px] group-hover:shadow-brand/50 group-hover:ring-brand/40"
      >
        <div className="relative aspect-4/5 overflow-hidden">
          <img
            src={stream.thumbnail || member?.photo || ''}
            alt={stream.memberName}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <LiveDot />
            <PlatformBadge platform={stream.platform} />
          </div>
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs backdrop-blur">
            <EyeIcon width={13} height={13} /> {formatCompact(stream.viewers)}
          </span>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-2.5">
              {member?.photo && (
                <img src={member.photo} alt="" className="size-9 rounded-full object-cover ring-2 ring-brand" />
              )}
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold leading-tight">{stream.memberName}</h3>
                <p className="text-xs text-white/60">Mulai {formatRelative(stream.startedAt)}</p>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-white/80">{stream.title}</p>
          </div>
        </div>
      </Link>

      <Link
        to={`/multi?s=${stream.platform}:${stream.roomId}`}
        title="Buka di multi-view"
        className="absolute bottom-4 right-4 grid size-9 translate-y-2 place-items-center rounded-full bg-white/10 opacity-0 backdrop-blur transition-all hover:bg-brand group-hover:translate-y-0 group-hover:opacity-100"
      >
        <GridIcon width={16} height={16} />
      </Link>
    </motion.article>
  )
}

export function LiveCardSkeleton() {
  return <div className="skeleton aspect-4/5 rounded-3xl" />
}
