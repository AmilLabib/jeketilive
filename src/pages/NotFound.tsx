import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-8xl italic text-gradient">404</p>
      <p className="mt-2 text-muted">Halaman tidak ditemukan.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-white">
        Kembali ke beranda
      </Link>
    </div>
  )
}
