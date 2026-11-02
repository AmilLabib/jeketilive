import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, ScrollRestoration, useLocation, useOutlet } from 'react-router'
import { useLives } from '../lib/api'

const YEAR = new Date().getFullYear()

const NAV = [
  { to: '/', label: 'Live' },
  { to: '/multi', label: 'Multi-view' },
  { to: '/riwayat', label: 'Riwayat' },
  { to: '/member', label: 'Member' },
]

function Navbar() {
  const { data } = useLives()
  const liveCount = data?.streams.length ?? 0

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-sm text-white shadow-[0_0_24px_-4px] shadow-brand">
            J
          </span>
          <span className="hidden sm:inline">
            Jeketi<span className="font-display text-xl font-normal italic text-gradient">live</span>
          </span>
        </NavLink>

        <nav className="ml-auto flex items-center gap-1 overflow-x-auto text-sm">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="relative rounded-full px-3 py-1.5">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-line"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className={`relative flex items-center gap-1.5 ${isActive ? 'text-text' : 'text-muted hover:text-text'}`}>
                    {item.label}
                    {item.to === '/' && liveCount > 0 && (
                      <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold leading-4 text-white">{liveCount}</span>
                    )}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default function Layout() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      {/* Ambient glow behind everything */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 -top-40 size-[36rem] animate-float rounded-full bg-brand/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 size-[30rem] animate-float rounded-full bg-brand-2/10 blur-[120px] [animation-delay:-4s]" />
      </div>

      <Navbar />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6"
        >
          {outlet}
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-line py-8 text-center text-xs text-muted">
        © {YEAR} Jeketilive · Fan project, tidak berafiliasi dengan JKT48, IDN, atau Showroom.
      </footer>
      <ScrollRestoration />
    </div>
  )
}
