import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router'
import ChatPanel from '../components/ChatPanel'
import { ExternalIcon, EyeIcon, GridIcon } from '../components/icons'
import LiveCard from '../components/LiveCard'
import Player from '../components/Player'
import { EmptyState, LiveDot, PlatformBadge, SectionTitle } from '../components/ui'
import { memberBySlug, useStream } from '../lib/api'
import { formatNumber, formatRelative } from '../lib/format'

export default function Watch() {
  const { platform, roomId } = useParams()
  const { stream, data, isPending } = useStream(platform, roomId)

  if (isPending) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="skeleton aspect-video rounded-3xl" />
        <div className="skeleton h-96 rounded-3xl lg:h-auto" />
      </div>
    )
  }

  if (!stream) {
    return (
      <EmptyState>
        Live ini sudah berakhir atau tidak ditemukan.{' '}
        <Link to="/" className="text-brand-2 hover:underline">
          Lihat yang sedang live →
        </Link>
      </EmptyState>
    )
  }

  const member = memberBySlug.get(stream.memberSlug)
  const others = data?.streams.filter((s) => s.sessionId !== stream.sessionId) ?? []
  const vertical = stream.platform === 'idn'

  return (
    <div className="space-y-12">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl bg-black ring-1 ring-line">
            <Player
              key={stream.sessionId}
              stream={stream}
              className={`mx-auto rounded-3xl ${vertical ? 'aspect-9/16 max-h-[78vh]' : 'aspect-video'}`}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center gap-4 rounded-3xl bg-surface p-4 ring-1 ring-line"
          >
            {member?.photo && (
              <Link to={`/member/${member.slug}`}>
                <img src={member.photo} alt="" className="size-14 rounded-full object-cover ring-2 ring-brand" />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{stream.memberName}</h1>
                <LiveDot />
                <PlatformBadge platform={stream.platform} />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">{stream.title}</p>
              <p className="mt-1 flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <EyeIcon width={13} height={13} /> {formatNumber(stream.viewers)} penonton
                </span>
                <span>Mulai {formatRelative(stream.startedAt)}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/multi?s=${stream.platform}:${stream.roomId}`}
                className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-sm ring-1 ring-line hover:ring-brand/50"
              >
                <GridIcon width={15} height={15} /> Multi-view
              </Link>
              <a
                href={stream.roomUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand/85"
              >
                <ExternalIcon width={15} height={15} /> Buka di platform
              </a>
            </div>
          </motion.div>
        </div>

        <ChatPanel key={stream.sessionId} stream={stream} className="h-[28rem] lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]" />
      </div>

      {others.length > 0 && (
        <section>
          <SectionTitle title="Live lainnya" />
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.05 }}
            className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
          >
            {others.map((s) => (
              <LiveCard key={s.sessionId} stream={s} />
            ))}
          </motion.div>
        </section>
      )}
    </div>
  )
}
