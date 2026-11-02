import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router'
import { SearchIcon } from '../components/icons'
import { LiveDot, SectionTitle } from '../components/ui'
import { members } from '../data/members'
import { useLives } from '../lib/api'

export default function Members() {
  const [query, setQuery] = useState('')
  const { data } = useLives()
  const liveSlugs = new Set(data?.streams.map((s) => s.memberSlug))

  const q = query.trim().toLowerCase()
  const filtered = members
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.nickname.toLowerCase().includes(q))
    .sort((a, b) => Number(liveSlugs.has(b.slug)) - Number(liveSlugs.has(a.slug)) || a.nickname.localeCompare(b.nickname))

  return (
    <div>
      <SectionTitle
        title="Member"
        subtitle={`${members.length} akun JKT48 yang dipantau di IDN Live dan Showroom.`}
        action={
          <label className="flex h-10 items-center gap-2 rounded-full bg-surface px-4 ring-1 ring-line focus-within:ring-brand/60">
            <SearchIcon width={16} height={16} className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari member..."
              className="w-40 bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </label>
        }
      />

      <motion.div
        key={q}
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.02 }}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      >
        {filtered.map((m) => (
          <motion.div
            key={m.slug}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -5 }}
          >
            <Link to={`/member/${m.slug}`} className="group block">
              <div
                className={`relative aspect-square overflow-hidden rounded-3xl bg-surface ring-1 transition-shadow ${liveSlugs.has(m.slug) ? 'ring-2 ring-brand shadow-[0_0_30px_-6px] shadow-brand' : 'ring-line group-hover:ring-brand/40'}`}
              >
                {m.photo && (
                  <img src={m.photo} alt={m.nickname} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                {liveSlugs.has(m.slug) && <LiveDot className="absolute left-2.5 top-2.5" />}
              </div>
              <p className="mt-2 font-semibold">{m.nickname}</p>
              <p className="truncate text-xs text-muted">{m.name}</p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
