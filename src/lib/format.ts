const number = new Intl.NumberFormat('id-ID')
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact' })
const relative = new Intl.RelativeTimeFormat('id', { numeric: 'auto' })
const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const date = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' })

export const formatNumber = (value: number) => number.format(value)
export const formatCompact = (value: number) => compact.format(value)
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
export const formatDate = (iso: string) => date.format(new Date(iso))

export function formatRelative(iso: string | null) {
  if (!iso) return '-'
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  return relative.format(Math.round(hours / 24), 'day')
}

export function formatDuration(fromIso: string, toIso: string) {
  const minutes = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h} jam ${m} mnt` : `${m} mnt`
}
