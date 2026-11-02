import type { SVGProps } from 'react'

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

type P = SVGProps<SVGSVGElement>

export const PlayIcon = (p: P) => (
  <svg {...base} {...p}><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg>
)
export const PauseIcon = (p: P) => (
  <svg {...base} {...p}><path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor" stroke="none" /></svg>
)
export const VolumeIcon = (p: P) => (
  <svg {...base} {...p}><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
)
export const MuteIcon = (p: P) => (
  <svg {...base} {...p}><path d="M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6" /></svg>
)
export const ExpandIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
)
export const EyeIcon = (p: P) => (
  <svg {...base} {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
)
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const PlusIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
)
export const GridIcon = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>
)
export const ExternalIcon = (p: P) => (
  <svg {...base} {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>
)
export const RefreshIcon = (p: P) => (
  <svg {...base} {...p}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
)
export const SearchIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
