# Jeketilive

Mirror live member JKT48 dari **IDN Live** dan **Showroom**: daftar live, player HLS, komentar realtime, multi-view, riwayat live, dan profil member.

React + Vite + TypeScript + Tailwind v4 + Framer Motion. Deploy di Vercel, proxy playlist video IDN di Cloudflare Workers, riwayat di Supabase.

## Jalankan di lokal

```bash
npm install
npm run dev
```

Dev server sudah melayani `api/*` dan proxy HLS di `/hls`, jadi tidak perlu Vercel CLI / Wrangler. Riwayat live baru muncul setelah env Supabase diisi (`cp .env.example .env`).

## Struktur

| Path | Isi |
|---|---|
| `src/` | Aplikasi React |
| `api/` | Vercel functions: `lives` (daftar live), `idn-chat` (id room chat IDN), `cron/snapshot` (catat riwayat) |
| `worker/` | Cloudflare Worker proxy playlist video IDN |
| `data/members.json` | Pemetaan member ↔ akun IDN/Showroom (edit manual) |
| `supabase/schema.sql` | Tabel `live_sessions` |

## Update data member

Edit `data/members.json`, lalu jalankan:

```bash
npm run sync:members
```

Ini membuat ulang `src/data/members.ts` dan mengambil foto terbaru dari Showroom/IDN. ID IDN (`idnId`) adalah `uuid` creator, ID Showroom (`showroomId`) adalah `room_id`.

## Deploy

1. **Supabase**: buat project, jalankan `supabase/schema.sql` di SQL Editor. Catat URL, anon key, dan service role key.
2. **Cloudflare Worker**:
   ```bash
   cd worker
   npx wrangler deploy
   ```
   Catat URL-nya, contoh `https://jeketilive-hls-proxy.<subdomain>.workers.dev`.
   Catatan: sebagian live IDN dikunci khusus IP Indonesia. IP Cloudflare bukan Indonesia, jadi di versi online live itu menampilkan tombol "Tonton di IDN". Di `npm run dev` semua live jalan karena lewat koneksi lokal.
3. **Vercel**: import repo, lalu isi Environment Variables:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `VITE_HLS_PROXY_URL` = URL worker dari langkah 2
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET` = string acak panjang
4. **GitHub Actions** (snapshot riwayat tiap 5 menit): di repo → Settings → Secrets → Actions, tambahkan
   - `SITE_URL` = domain Vercel, contoh `https://jeketilive.vercel.app`
   - `CRON_SECRET` = sama dengan di Vercel
