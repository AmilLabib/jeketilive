import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { memberBySlug, useHistory } from '../lib/api'
import { formatDateTime, formatDuration, formatNumber } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Platform } from '../lib/types'
import { EmptyState, PlatformBadge } from './ui'

interface Props {
  platform?: Platform
  memberSlug?: string
  limit?: number
}

export default function SessionList(props: Props) {
  const { data, isPending, error } = useHistory(props)

  if (!supabase) {
    return <EmptyState>Riwayat live belum aktif. Isi env Supabase dulu (lihat README).</EmptyState>
  }
  if (error) return <EmptyState>Riwayat gagal dimuat: {error.message}</EmptyState>
  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (data.length === 0) return <EmptyState>Belum ada riwayat live yang tercatat.</EmptyState>

  return (
    <motion.ul initial="hidden" animate="show" transition={{ staggerChildren: 0.04 }} className="space-y-3">
      {data.map((s) => {
        const member = memberBySlug.get(s.member_slug)
        return (
          <motion.li
            key={s.id}
            variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
            className="flex items-center gap-4 rounded-2xl bg-surface p-3 ring-1 ring-line transition-colors hover:ring-brand/40"
          >
            <img
              src={s.thumbnail || member?.photo || ''}
              alt=""
              loading="lazy"
              className="size-14 shrink-0 rounded-xl bg-surface-2 object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/member/${s.member_slug}`} className="font-semibold hover:text-brand-2">
                  {s.member_name}
                </Link>
                <PlatformBadge platform={s.platform} />
              </div>
              <p className="truncate text-sm text-muted">{s.title}</p>
            </div>
            <dl className="hidden shrink-0 grid-cols-3 gap-6 text-right text-sm sm:grid">
              <div>
                <dt className="text-xs text-muted">Mulai</dt>
                <dd>{formatDateTime(s.started_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Durasi</dt>
                <dd>{formatDuration(s.started_at, s.ended_at!)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Puncak penonton</dt>
                <dd>{formatNumber(s.peak_viewers)}</dd>
              </div>
            </dl>
            <p className="shrink-0 text-right text-xs text-muted sm:hidden">
              {formatDuration(s.started_at, s.ended_at!)}
              <br />
              {formatNumber(s.peak_viewers)} penonton
            </p>
          </motion.li>
        )
      })}
    </motion.ul>
  )
}
