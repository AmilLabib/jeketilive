import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router'
import SessionList from '../components/SessionList'
import { EmptyState, LiveDot, PlatformBadge, SectionTitle } from '../components/ui'
import { memberBySlug, useLives } from '../lib/api'
import { formatDate } from '../lib/format'

function age(birthday: string) {
  const born = new Date(birthday)
  const now = new Date()
  const hadBirthday = now.getMonth() > born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate())
  return now.getFullYear() - born.getFullYear() - (hadBirthday ? 0 : 1)
}

export default function MemberDetail() {
  const { slug = '' } = useParams()
  const member = memberBySlug.get(slug)
  const { data } = useLives()

  if (!member) {
    return (
      <EmptyState>
        Member tidak ditemukan.{' '}
        <Link to="/member" className="text-brand-2 hover:underline">
          Lihat daftar member →
        </Link>
      </EmptyState>
    )
  }

  const live = data?.streams.filter((s) => s.memberSlug === slug) ?? []
  const links = [
    member.showroomKey && { label: 'Showroom', href: `https://www.showroom-live.com/r/${member.showroomKey}` },
    member.idnUsername && { label: 'IDN Live', href: `https://www.idn.app/${member.idnUsername}` },
    member.instagram && { label: 'Instagram', href: `https://instagram.com/${member.instagram}` },
    member.twitter && { label: 'X / Twitter', href: `https://x.com/${member.twitter}` },
    member.tiktok && { label: 'TikTok', href: `https://www.tiktok.com/@${member.tiktok}` },
  ].filter((l): l is { label: string; href: string } => Boolean(l))

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-surface ring-1 ring-line">
        {member.photo && (
          <img src={member.photo} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover opacity-25 blur-3xl" />
        )}
        <div className="relative flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-end sm:p-10">
          <motion.img
            initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 16 }}
            src={member.photo ?? ''}
            alt={member.nickname}
            className="size-40 rounded-[2rem] object-cover shadow-2xl ring-4 ring-brand/60 sm:size-48"
          />
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center sm:text-left"
          >
            <p className="text-sm uppercase tracking-[0.25em] text-brand-2">JKT48</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{member.nickname}</h1>
            <p className="mt-1 font-display text-xl italic text-white/70">{member.name}</p>
            {member.birthday && (
              <p className="mt-3 text-sm text-muted">
                Lahir {formatDate(member.birthday)} · {age(member.birthday)} tahun
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm backdrop-blur transition-colors hover:bg-brand"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {live.map((s) => (
        <Link
          key={s.sessionId}
          to={`/live/${s.platform}/${s.roomId}`}
          className="flex items-center gap-3 rounded-2xl bg-brand/15 p-4 ring-1 ring-brand/50 transition-colors hover:bg-brand/25"
        >
          <LiveDot />
          <PlatformBadge platform={s.platform} />
          <span className="truncate font-medium">{s.title}</span>
          <span className="ml-auto shrink-0 text-sm text-brand-2">Tonton sekarang →</span>
        </Link>
      ))}

      <section>
        <SectionTitle title={`Riwayat live ${member.nickname}`} />
        <SessionList memberSlug={slug} />
      </section>
    </div>
  )
}
