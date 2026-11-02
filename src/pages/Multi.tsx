import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'react-router'
import { CloseIcon, PlusIcon } from '../components/icons'
import Player from '../components/Player'
import { EmptyState, PlatformBadge, SectionTitle } from '../components/ui'
import { memberBySlug, useLives } from '../lib/api'
import { formatCompact } from '../lib/format'

const MAX_SLOTS = 4
const GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 xl:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
}

export default function Multi() {
  const [params, setParams] = useSearchParams()
  const { data, isPending } = useLives()
  const streams = data?.streams ?? []

  // Slots live in the URL (?s=showroom:123,idn:slug) so a layout can be shared.
  const slots = (params.get('s') ?? '').split(',').filter(Boolean).slice(0, MAX_SLOTS)
  const setSlots = (next: string[]) => setParams(next.length ? { s: next.join(',') } : {}, { replace: true })
  const keyOf = (s: { platform: string; roomId: string }) => `${s.platform}:${s.roomId}`
  const available = streams.filter((s) => !slots.includes(keyOf(s)))

  return (
    <div className="space-y-10">
      <SectionTitle
        title="Multi-view"
        subtitle={`Tonton sampai ${MAX_SLOTS} live sekaligus. Atur suara di tiap player, layout tersimpan di URL.`}
      />

      {slots.length === 0 ? (
        <EmptyState>Belum ada live yang dipilih. Tambahkan dari daftar di bawah.</EmptyState>
      ) : (
        <motion.div layout className={`grid items-start gap-4 ${GRID[slots.length]}`}>
          <AnimatePresence mode="popLayout">
            {slots.map((key, index) => {
              const stream = streams.find((s) => keyOf(s) === key)
              return (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="truncate font-semibold">{stream?.memberName ?? key}</span>
                    {stream && <PlatformBadge platform={stream.platform} />}
                    <button
                      onClick={() => setSlots(slots.filter((k) => k !== key))}
                      className="ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-text"
                      aria-label="Hapus dari multi-view"
                    >
                      <CloseIcon width={16} height={16} />
                    </button>
                  </div>
                  {stream ? (
                    <Player
                      key={stream.sessionId}
                      stream={stream}
                      startMuted={index > 0}
                      className={stream.platform === 'idn' ? 'mx-auto aspect-9/16 max-h-[70vh]' : 'aspect-video'}
                    />
                  ) : (
                    <div className="grid aspect-video place-items-center bg-black text-sm text-muted">
                      {isPending ? 'Memuat...' : 'Live sudah berakhir'}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <section>
        <h3 className="mb-3 font-semibold">Tambah live</h3>
        {available.length === 0 ? (
          <p className="text-sm text-muted">Tidak ada live lain yang bisa ditambahkan.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {available.map((s) => (
              <motion.button
                key={s.sessionId}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                disabled={slots.length >= MAX_SLOTS}
                onClick={() => setSlots([...slots, keyOf(s)])}
                className="flex items-center gap-2 rounded-full bg-surface py-1.5 pl-1.5 pr-3 text-sm ring-1 ring-line hover:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <img src={memberBySlug.get(s.memberSlug)?.photo ?? s.thumbnail} alt="" className="size-7 rounded-full object-cover" />
                {s.memberName}
                <span className="text-xs text-muted">{formatCompact(s.viewers)}</span>
                <PlusIcon width={15} height={15} className="text-brand-2" />
              </motion.button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
