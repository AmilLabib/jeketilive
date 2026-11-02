import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router'
import { RefreshIcon } from '../components/icons'
import LiveCard, { LiveCardSkeleton } from '../components/LiveCard'
import SessionList from '../components/SessionList'
import { CountUp, EmptyState, SectionTitle, Segmented } from '../components/ui'
import { useLives } from '../lib/api'
import { formatRelative } from '../lib/format'
import type { Platform } from '../lib/types'

type Filter = 'all' | Platform

const PLATFORM_NAME: Record<Platform, string> = { showroom: 'Showroom', idn: 'IDN Live' }

export default function Home() {
  const { data, isPending, isFetching, error, refetch } = useLives()
  const [filter, setFilter] = useState<Filter>('all')

  const streams = data?.streams ?? []
  const visible = filter === 'all' ? streams : streams.filter((s) => s.platform === filter)
  const stats = [
    { label: 'Sedang live', value: streams.length, accent: 'from-brand to-brand-2' },
    { label: 'Showroom', value: streams.filter((s) => s.platform === 'showroom').length, accent: 'from-showroom to-showroom/40' },
    { label: 'IDN Live', value: streams.filter((s) => s.platform === 'idn').length, accent: 'from-idn to-idn/40' },
  ]

  return (
    <div className="space-y-14">
      <section className="pt-6 sm:pt-12">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-brand-2"
        >
          IDN Live × Showroom
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: 'spring', stiffness: 120, damping: 18 }}
          className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl"
        >
          Tonton live <span className="font-display font-normal italic text-gradient">oshi</span> favoritmu.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 max-w-xl text-muted"
        >
          Semua live member JKT48 dari IDN Live dan Showroom di satu tempat, lengkap dengan komentar realtime dan
          multi-view.
        </motion.p>

        <div className="mt-10 grid grid-cols-3 gap-3 sm:max-w-2xl sm:gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.07 }}
              className="relative overflow-hidden rounded-2xl bg-surface p-4 ring-1 ring-line"
            >
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-linear-to-r ${s.accent}`} />
              <p className="text-xs text-muted sm:text-sm">{s.label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
                <CountUp value={s.value} />
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Sedang live"
          subtitle={data ? `Diperbarui ${formatRelative(data.updatedAt)} · otomatis tiap 30 detik` : 'Memuat data live...'}
          action={
            <div className="flex items-center gap-2">
              <Segmented
                id="home-filter"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'Semua' },
                  { value: 'showroom', label: 'Showroom' },
                  { value: 'idn', label: 'IDN' },
                ]}
              />
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-line hover:ring-brand/50 disabled:opacity-60"
                aria-label="Refresh"
              >
                <RefreshIcon width={17} height={17} className={isFetching ? 'animate-spin' : ''} />
              </button>
            </div>
          }
        />

        {data && data.failed.length > 0 && (
          <p className="mb-4 rounded-xl bg-amber-400/10 px-4 py-2 text-sm text-amber-300">
            Data {data.failed.map((p) => PLATFORM_NAME[p]).join(' & ')} sedang gagal dimuat, daftar mungkin belum lengkap.
          </p>
        )}

        {isPending ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <LiveCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <EmptyState>Data live belum bisa dimuat. Coba refresh sebentar lagi.</EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState>Belum ada member yang live sekarang. Cek lagi nanti ya!</EmptyState>
        ) : (
          <motion.div
            key={filter}
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.06 }}
            className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
          >
            <AnimatePresence>
              {visible.map((s) => (
                <LiveCard key={s.sessionId} stream={s} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Baru selesai live"
          action={
            <Link to="/riwayat" className="text-sm text-brand-2 hover:underline">
              Lihat semua →
            </Link>
          }
        />
        <SessionList limit={5} />
      </section>
    </div>
  )
}
