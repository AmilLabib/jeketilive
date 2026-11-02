import { useState } from 'react'
import SessionList from '../components/SessionList'
import { SectionTitle, Segmented } from '../components/ui'
import { members } from '../data/members'
import type { Platform } from '../lib/types'

export default function History() {
  const [platform, setPlatform] = useState<'all' | Platform>('all')
  const [memberSlug, setMemberSlug] = useState('')

  return (
    <div>
      <SectionTitle
        title="Riwayat live"
        subtitle="Live yang sudah selesai, dicatat otomatis tiap 5 menit."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={memberSlug}
              onChange={(e) => setMemberSlug(e.target.value)}
              className="h-10 rounded-full bg-surface px-4 text-sm outline-none ring-1 ring-line focus:ring-brand/60"
            >
              <option value="">Semua member</option>
              {members.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.nickname}
                </option>
              ))}
            </select>
            <Segmented
              id="history-filter"
              value={platform}
              onChange={setPlatform}
              options={[
                { value: 'all', label: 'Semua' },
                { value: 'showroom', label: 'Showroom' },
                { value: 'idn', label: 'IDN' },
              ]}
            />
          </div>
        }
      />
      <SessionList platform={platform === 'all' ? undefined : platform} memberSlug={memberSlug || undefined} />
    </div>
  )
}
