import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'
import { formatNumber } from '../lib/format'
import type { Platform } from '../lib/types'

export function LiveDot({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white ${className}`}>
      <span className="size-1.5 animate-live-ring rounded-full bg-white" />
      Live
    </span>
  )
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return platform === 'showroom' ? (
    <span className="rounded-full bg-showroom/15 px-2 py-0.5 text-[11px] font-semibold text-showroom">Showroom</span>
  ) : (
    <span className="rounded-full bg-idn/15 px-2 py-0.5 text-[11px] font-semibold text-idn">IDN Live</span>
  )
}

/** Number that counts up when it scrolls into view and animates on change. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const motionValue = useMotionValue(0)
  const text = useTransform(motionValue, (v) => formatNumber(Math.round(v)))

  useEffect(() => {
    if (!inView) return
    const controls = animate(motionValue, value, { duration: 1.1, ease: 'easeOut' })
    return () => controls.stop()
  }, [inView, value, motionValue])

  return <motion.span ref={ref}>{text}</motion.span>
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">{children}</div>
  )
}

export function Segmented<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-full bg-surface p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${value === o.value ? 'text-white' : 'text-muted hover:text-text'}`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
