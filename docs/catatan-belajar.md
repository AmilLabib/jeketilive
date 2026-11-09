# Catatan Belajar: Membangun Jeketilive

Rekap semua yang dipelajari selama membangun Jeketilive, website mirror live member JKT48 dari IDN Live dan Showroom. Ditulis dengan asumsi belum paham backend sama sekali, jadi istilah sekecil apa pun dijelaskan.

---

## Daftar Isi

1. [Gambaran besar project](#1-gambaran-besar-project)
2. [Dasar-dasar internet](#2-dasar-dasar-internet)
3. [Frontend vs backend](#3-frontend-vs-backend)
4. [Cara video live diputar (HLS)](#4-cara-video-live-diputar-hls)
5. [URI: alamat absolut dan relatif](#5-uri-alamat-absolut-dan-relatif)
6. [CORS: "satpam" browser](#6-cors-satpam-browser)
7. [Proxy: si perantara](#7-proxy-si-perantara)
8. [Geoblock dan misteri "kadang bisa, kadang enggak"](#8-geoblock-dan-misteri-kadang-bisa-kadang-enggak)
9. [Cloudflare Worker dan Durable Object](#9-cloudflare-worker-dan-durable-object)
10. [Environment variable dan rahasia](#10-environment-variable-dan-rahasia)
11. [Database, keamanan data, dan riwayat live](#11-database-keamanan-data-dan-riwayat-live)
12. [Pedoman backend](#12-pedoman-backend)
13. [Pelajaran debugging](#13-pelajaran-debugging)
14. [Batasan dan risiko project ini](#14-batasan-dan-risiko-project-ini)
15. [Kronologi perjalanan](#15-kronologi-perjalanan)
16. [Kamus istilah](#16-kamus-istilah)

---

## 1. Gambaran besar project

Jeketilive mengumpulkan semua live member JKT48 dari dua platform (IDN Live dan Showroom) ke satu website, lengkap dengan player video, komentar realtime, multi-view, riwayat live, dan profil member.

```
                    ┌──────────────────────────────┐
                    │  Browser pengunjung          │
                    │  (React, src/)               │
                    └──┬──────────┬─────────┬──────┘
                       │          │         │
         daftar live   │   video  │         │ riwayat
                       ▼   IDN    ▼         ▼
            ┌──────────────┐ ┌─────────────┐ ┌──────────┐
            │ Vercel       │ │ Cloudflare  │ │ Supabase │
            │ api/         │ │ Worker      │ │ database │
            └──────┬───────┘ └──────┬──────┘ └────▲─────┘
                   │                │             │ ditulis tiap 5 menit
                   ▼                ▼             │
            ┌──────────────────────────┐   ┌──────┴────────┐
            │  IDN Live & Showroom     │   │ GitHub Actions│
            └──────────────────────────┘   └───────────────┘
```

| Bagian | Teknologi | Tugas |
|---|---|---|
| Tampilan | React + Vite + TypeScript + Tailwind + Framer Motion | Halaman, kartu, player, animasi |
| API | Vercel Functions (`api/`) | Ambil daftar live, ID chat IDN, catat riwayat |
| Proxy video | Cloudflare Worker + Durable Object (`worker/`) | Ambilkan playlist master IDN |
| Database | Supabase | Simpan riwayat live |
| Penjadwal | GitHub Actions | Panggil pencatat riwayat tiap 5 menit |

---

## 2. Dasar-dasar internet

### Request dan response
Setiap interaksi di internet itu tanya-jawab:
- **Request** = permintaan. "Tolong kasih daftar live."
- **Response** = jawaban. "Nih daftarnya."

Kayak pesan di warung: "Mas, nasi goreng satu" (request), lalu masnya ngasih nasi goreng (response).

### Server
Komputer yang kerjanya menunggu request dan memberi jawaban, menyala 24 jam. IDN, Showroom, Vercel, Cloudflare, dan Supabase semuanya punya server.

### IP address
**Alamat rumah** sebuah perangkat di internet. Dari IP, server bisa menebak lokasi negara bahkan kotanya.

Ada dua jenis:
- **IPv4**: `182.8.67.23` (format lama, jumlahnya terbatas)
- **IPv6**: `2404:c0:b201:...` (format baru, jumlahnya sangat banyak)

Koneksi Telkomsel punya keduanya. Browser modern biasanya lebih memilih IPv6.

### DNS ≠ IP
**DNS** itu "buku telepon" internet: mengubah nama (`jeketilive.vercel.app`) jadi alamat IP. Mengganti DNS **tidak** mengubah IP kita di mata server lain. Jadi DNS bukan penyebab masalah wilayah.

### Kode status
Setiap jawaban server punya nomor:

| Kode | Arti | Perumpamaan |
|---|---|---|
| **200** | Berhasil | "Nih pesanannya" |
| **400** | Permintaan gak jelas | "Mas pesen apa sih?" |
| **401** | Belum terbukti siapa kamu | "Tunjukin kartu member dulu" |
| **403** | Ditolak, gak boleh | "Maaf, khusus member" |
| **404** | Gak ada | "Menu itu sudah habis" (misalnya live sudah selesai) |
| **429** | Kebanyakan minta | "Sabar, antre!" |
| **500** | Server-nya error | "Dapur lagi kebakaran" |

### Koneksi dan sifat "hemat" browser
Sebelum mengirim request, browser harus **tersambung** dulu ke server, kayak menelepon. Setelah tersambung, **browser tidak menutup sambungannya**, tapi memakainya lagi untuk request-request berikutnya ke alamat yang sama.

> 💡 **Insight penting:** fakta kecil ini ternyata jadi kunci masalah "kadang bisa, kadang enggak" (lihat [bagian 8](#8-geoblock-dan-misteri-kadang-bisa-kadang-enggak)).

---

## 3. Frontend vs backend

| | Frontend | Backend |
|---|---|---|
| Jalan di mana | **Browser pengunjung** | **Server** |
| Tujuan | Tampilan sesuai harapan, enak dipakai | Data benar, aman, dan andal |
| Bisa dilihat pengunjung? | Ya, semua kodenya terunduh ke browser | Tidak |
| Di project ini | `src/` | `api/`, `worker/`, Supabase, GitHub Actions |

### Kenapa kode backend berbentuk fungsi?
Karena pekerjaan backend pada dasarnya:

```
terima permintaan  →  olah  →  kirim jawaban
    (input)          (proses)    (output)
```

Bentuk itu persis sebuah **fungsi**. Contohnya `GET(request)` di [api/lives.ts](../api/lives.ts): terima `Request`, kembalikan `Response`.

### Serverless
Kita tidak menyewa "server utuh" yang menyala terus. Kita cuma menitipkan **fungsi-fungsi kecil** ke Vercel atau Cloudflare. Fungsinya dinyalakan saat ada permintaan, lalu dimatikan lagi. Konsekuensinya: **fungsi tidak "ingat" apa pun** antar-permintaan. Data yang harus bertahan wajib disimpan di database.

---

## 4. Cara video live diputar (HLS)

Video live tidak dikirim sebagai satu file besar, tapi **dipotong-potong** sekitar 2–6 detik. Sistem ini namanya **HLS**, dan ada tiga jenis file.

### Master playlist: "menu pilihan kualitas"
File teks pertama yang diminta player. Isinya daftar kualitas yang tersedia dan alamat playlist variant masing-masing.

```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=720x1280
https://...playlist.live-video.net/v1/playlist/AbC123....m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1200000,RESOLUTION=480x854
https://...playlist.live-video.net/v1/playlist/DeF456....m3u8
```

- Baris diawali `#` = **keterangan** (misalnya "kualitas 720x1280, butuh ±2,5 Mbps").
- Baris tanpa `#` = **alamat**.

### Variant playlist: "daftar potongan untuk satu kualitas"
```
#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:1830
#EXTINF:6.0,
https://...cloudfront.hls.live-video.net/.../segment1830.ts
#EXTINF:6.0,
https://...cloudfront.hls.live-video.net/.../segment1831.ts
```
Terus diperbarui tiap beberapa detik karena live masih berjalan.

### Segment: potongan videonya
File berisi gambar dan suara beberapa detik. Ini satu-satunya yang berat.

### Perumpamaan buku panduan TV
- **Master** = halaman depan: "Versi HD di halaman 10, versi SD di halaman 20." Dibaca **sekali**.
- **Variant** = halaman 10: "Menit 0–6 di kaset A, menit 6–12 di kaset B…" Dicek **berulang**.
- **Segment** = kasetnya. Diputar satu per satu.

### Urutan kerja player
```
1. Minta master          → tahu kualitas apa saja
2. Pilih kualitas        → minta variant
3. Minta segment 1830, 1831, 1832, … terus selama menonton
```

Yang mengerjakan ini di website adalah library **hls.js**, ditambah kontrol buatan sendiri di [src/components/Player.tsx](../src/components/Player.tsx).

### Showroom vs IDN
| | Showroom | IDN Live |
|---|---|---|
| Orientasi video | Horizontal (16:9) | Vertikal (9:16) |
| Bisa diputar langsung dari browser? | ✅ Ya | ❌ Master-nya perlu proxy |

---

## 5. URI: alamat absolut dan relatif

**URI** (*Uniform Resource Identifier*) = alamat atau nama sesuatu di internet. URL yang biasa diketik di browser termasuk URI. Sehari-hari, **URI ≈ alamat**.

Di dalam playlist, alamat bisa ditulis dua cara:

| Jenis | Contoh | Perumpamaan |
|---|---|---|
| **Absolut** | `https://abc.live-video.net/v1/playlist/xyz.m3u8` | "Jl. Sudirman No. 5, Jakarta" |
| **Relatif** | `xyz.m3u8` atau `../segment1830.ts` | "Rumah sebelah" |

Alamat relatif **dihitung dari lokasi file yang sedang dibaca**.

### Kenapa ini penting di project ini
Master diambil **lewat Worker**. Bagi browser, file itu datang dari alamat Worker. Kalau di dalamnya tertulis "rumah sebelah", browser akan mencari di sebelah Worker, dan itu salah alamat.

Solusinya ada di fungsi **`absolutizePlaylist`** di [worker/hls-proxy.ts](../worker/hls-proxy.ts). Semua alamat di master diubah jadi alamat lengkap yang menunjuk langsung ke server IDN, termasuk alamat di dalam keterangan berbentuk `URI="..."`.

### Encoding alamat di dalam alamat
Alamat master dikirim ke Worker sebagai parameter:
```
https://jeketilive-hls-proxy...workers.dev/?url=https%3A%2F%2F...
```
`%3A%2F%2F` adalah `://` yang "dibungkus" (*URL encoding*) supaya tidak bentrok dengan alamat Worker. Di JavaScript, ini dilakukan oleh `encodeURIComponent`.

---

## 6. CORS: "satpam" browser

### Aturannya
> Website A (Jeketilive) hanya boleh **membaca** data dari website B (IDN) **lewat browser** kalau website B memberi **surat izin**.

Surat izinnya adalah keterangan di jawaban server: `Access-Control-Allow-Origin: *`. Kalau tidak ada, browser **membuang** jawabannya walaupun sudah sampai.

### Kenapa CORS ada?
**CORS melindungi pengunjung, bukan melindungi IDN.** Bayangkan lu sedang login internet banking, lalu iseng membuka website jahat. Tanpa CORS, website jahat itu bisa menyuruh **browser lu** mengambil data dari bank. Browser otomatis ikut mengirim tanda login (*cookie*) lu, jadi bank mengira itu lu sendiri, dan website jahat bisa membaca saldo lu.

### Kenapa server tidak kena CORS?
Server tidak membawa tanda login pengunjung. Saat server meminta data, dia meminta sebagai "orang asing" tanpa identitas siapa pun, jadi tidak ada data pribadi yang bisa dicuri. Karena itu aturan CORS memang **hanya diterapkan oleh browser**.

> 💡 **Insight:** Dulu lu bisa scrape IDN pakai Python tanpa masalah karena **Python bukan browser**, jadi tidak ada satpam CORS. Script-nya juga jalan dari laptop dengan IP Indonesia, jadi kunci wilayah ikut lolos.

### Hasil pemeriksaan CORS sumber data

| Sumber | Ada izin CORS? | Solusi |
|---|---|---|
| API GraphQL IDN (daftar live) | ✅ | Diambil server tetap, demi cache |
| Master playlist IDN | ❌ | Lewat Cloudflare Worker |
| Variant playlist dan segment IDN | ✅ | Browser ambil langsung |
| API Showroom (`onlives`) | ❌ | Lewat Vercel `api/lives` |
| Video Showroom (HLS) | ✅ | Browser ambil langsung |
| Chat IDN dan Showroom (WebSocket) | Tidak berlaku | Browser sambung langsung |

> 💡 **Insight:** Jangan berasumsi semua file dari satu platform punya aturan yang sama. Cek satu per satu. Gara-gara pengecekan ini, proxy cukup menangani master yang kecil, dan video yang berat tidak lewat server kita.

---

## 7. Proxy: si perantara

**Proxy** = perantara, kayak **jasa titip (jastip)**.

```
Browser ──minta──► Proxy ──minta──► IDN
Browser ◄── kasih + surat izin CORS ── Proxy ◄── kasih ── IDN
```

Proxy itu server, jadi tidak kena CORS. Setelah dapat data, dia menempelkan surat izin sendiri sebelum diteruskan ke browser.

### Proxy yang baik itu hemat
Versi awal mem-proxy **semua** file, termasuk segment video. Itu boros, karena satu penonton bisa menghasilkan 1.000–2.000 request per jam. Setelah tahu hanya master yang bermasalah, proxy hanya mengambil master **sekali per penonton**, dan sisanya langsung dari IDN.

### Proxy harus dikunci
Proxy yang menerima alamat apa saja bisa dipakai orang untuk mengakses website mana pun lewat server kita. Karena itu Worker mengecek dulu bahwa alamat yang diminta berakhiran `live-video.net` (server video IDN). Kalau bukan, ditolak 403.

### Website referensi melakukan apa?
jkt48live.github.io memakai **14 proxy CORS gratisan milik orang lain** (semuanya Cloudflare Worker) dan mencobanya satu per satu. Tidak ada trik rahasia: intinya terus mencoba sampai ada yang lolos. Kekurangannya: bergantung pada proxy orang lain yang bisa mati atau kena limit kapan saja (kita sempat kena 429 saat menguji proxy mereka).

---

## 8. Geoblock dan misteri "kadang bisa, kadang enggak"

### Geoblock
Sebagian live di IDN **dikunci berdasarkan wilayah**. Kuncinya hanya di master:
- Permintaan dari Asia: 200
- Permintaan dari luar Asia: 403, `"Content Restricted In Region"` (`content_geoblocked`)

Awalnya dikira khusus Indonesia. Hasil eksperimen menunjukkan **Singapura, Seoul, Tokyo, dan Osaka juga diizinkan**, jadi kemungkinan kuncinya wilayah Asia.

### Cloudflare punya ratusan gedung server
Cloudflare punya data center di seluruh dunia. Masing-masing punya kode tiga huruf (*colo*):

| Kode | Kota |
|---|---|
| SIN | Singapura |
| ICN | Seoul |
| NRT, KIX | Tokyo, Osaka |
| LAX, SJC | Los Angeles, San Jose |
| CDG, MRS | Paris, Marseille |
| WAW | Warsawa |

### Penyebab sebenarnya
1. Koneksi Telkomsel di paket gratis Cloudflare sering **dilempar ke gedung jauh** (AS atau Eropa), bukan ke Singapura.
2. Worker dijalankan di gedung itu, jadi IDN melihat permintaannya dari luar Asia dan menolak.
3. Gedungnya **menempel di koneksi**. Karena browser memakai ulang koneksi yang sama, semua retry juga mendarat di gedung yang sama.

Data dari 20 koneksi baru:

| Gedung | Lolos |
|---|---|
| SIN | 8/9 |
| SJC, LAX | 0/6 |
| CDG, MRS | 0/3 |
| WAW | 0/2 |

Satu koneksi dipakai ulang vs koneksi baru tiap request:

| Live | Koneksi baru tiap request | Satu koneksi dipakai ulang |
|---|---|---|
| Delynn | 5/15 | **0/15** |
| Aralie | 5/15 | **0/15** |
| Fritzy | 3/15 | **15/15** |

Ini menjelaskan semua gejala: laptop gagal dan HP bisa, lalu gantian; di HP cuma satu member yang bisa; hasil berubah setelah idle atau buka ulang tab (koneksinya diganti, gedungnya diundi ulang).

### Dugaan yang terbukti salah
| Dugaan | Hasil uji |
|---|---|
| DNS | Bukan, DNS tidak mengubah IP |
| VPN di laptop | Bukan, IP terdeteksi Indonesia dan incognito juga gagal |
| Meneruskan IP penonton (`X-Forwarded-For`) | Tidak berpengaruh, dihapus |
| IPv6 lebih sering ditolak | Sempat terlihat begitu, tapi penyebab utamanya gedung Cloudflare |
| Retry 10x di player | Gagal di browser, karena retry lewat koneksi yang sama |
| Retry 10x di dalam Worker | 0/10, karena Worker tetap di gedung yang sama |

---

## 9. Cloudflare Worker dan Durable Object

### Cloudflare Worker
Kode kecil yang dititipkan ke Cloudflare dan bisa jalan di gedung mana saja. Gratis sampai 100.000 request per hari. Kode: [worker/hls-proxy.ts](../worker/hls-proxy.ts).

### Durable Object = "petugas tetap" di satu lokasi
Fitur Cloudflare berisi potongan kode yang **tinggal di satu gedung tetap**. Saat pertama dibuat, bisa diberi petunjuk lokasi (*location hint*). Kita memakai `apac` (Asia-Pasifik). Fitur ini tersedia di paket gratis.

```
Browser ──► Worker (di gedung mana saja, bisa Los Angeles)
               │
               └──► Durable Object (tetap di Asia) ──► IDN
                       IDN melihat "dari Asia" → izinkan ✅
```

Perumpamaan: cabang jastip mana pun yang mengangkat telepon, mereka tidak membeli sendiri. Mereka **selalu menyuruh kurir tetap di Singapura** yang punya akses ke toko.

### Bukti
| Uji | Hasil |
|---|---|
| Durable Object Asia, 5 objek, masuk lewat AS, Eropa, dan Asia | 30/30 lolos |
| Durable Object Asia, satu koneksi masuk lewat California | 24/24 untuk live yang masih jalan |
| Worker utama setelah diterapkan, satu koneksi, 6 live × 3 putaran | **18/18 lolos**, semua sampai segment video |

### Struktur kodenya
- `handleMaster(request)`: logika proxy (validasi, ambil master, ubah alamat, tempel izin CORS)
- `MasterFetcher`: Durable Object yang memanggil `handleMaster`
- `default.fetch`: Worker yang meneruskan semua permintaan ke `MasterFetcher` di Asia
- Di `npm run dev`, `handleMaster` dipanggil langsung tanpa Durable Object, karena laptop sudah ber-IP Indonesia.

### Pilihan lain yang sempat dicoba
| Pilihan | Hasil |
|---|---|
| AWS Lambda region Jakarta | Gagal: halaman login AWS terus berputar |
| Google Cloud Run region Jakarta | Batal: minta pembayaran di muka |
| Cloudflare Tunnel ke perangkat di rumah | Tidak dicoba, karena perangkat harus menyala 24 jam |
| **Durable Object Asia** | ✅ Dipakai: gratis, tanpa akun baru |

---

## 10. Environment variable dan rahasia

### Apa itu environment variable (env)?
Pengaturan yang disimpan **di luar kode**, misalnya alamat database atau kunci rahasia. Di lokal disimpan di file `.env`. Di Vercel diisi lewat **Settings → Environment Variables**.

`.env` **tidak boleh masuk Git** (sudah tercantum di `.gitignore`). File `.env.example` berisi templat kosong untuk panduan.

### Awalan `VITE_` = ikut dikirim ke browser
Vite **menanam** variabel berawalan `VITE_` ke dalam kode JavaScript saat build. Siapa pun bisa melihatnya lewat DevTools.

| Variabel | Rahasia? | Awalan |
|---|---|---|
| `VITE_SUPABASE_URL` | Bukan | `VITE_` |
| `VITE_SUPABASE_ANON_KEY` (kunci **publishable**) | Bukan | `VITE_` |
| `VITE_HLS_PROXY_URL` | Bukan | `VITE_` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Rahasia** | Tanpa awalan |
| `CRON_SECRET` | **Rahasia** | Tanpa awalan |

> ⚠️ **Kejadian nyata:** kunci admin Supabase (service_role) sempat diisi di `VITE_SUPABASE_ANON_KEY`. Kalau ter-deploy, siapa pun bisa membaca, mengubah, dan menghapus seluruh database. Untungnya ketahuan sebelum masuk Git. **Selalu cek ulang jenis kunci setiap kali mengisi env.**

### Peringatan Vercel soal awalan publik
Vercel memperingatkan bahwa `VITE_` akan terekspos ke browser. Untuk nilai yang memang bukan rahasia, pilih **Config** dan **jangan** hapus awalannya. Kalau dihapus, nilainya tidak sampai ke browser dan fitur yang membutuhkannya rusak.

### Env `VITE_` dibaca saat build, bukan saat jalan
> 💡 **Kejadian nyata:** website online sempat memanggil `/hls` (yang hanya ada di dev server) karena `VITE_HLS_PROXY_URL` belum terbaca saat Vercel build. Akibatnya player menerima halaman HTML, bukan playlist, lalu terus "Menyambungkan ulang…".
>
> **Pelajaran:** setelah mengubah env `VITE_` di Vercel, wajib **Redeploy**, sebaiknya tanpa build cache.

### Bug kecil di dev server
Vite `loadEnv` mendahulukan nilai yang sudah ada di memori. Akibatnya, setelah `.env` diubah, nilai lama yang kosong tetap dipakai. Solusinya: [vite.config.ts](../vite.config.ts) selalu membaca ulang `.env` memakai parser bawaan Node (`parseEnv`).

---

## 11. Database, keamanan data, dan riwayat live

### Supabase
Layanan database (PostgreSQL) gratis. Tabelnya `live_sessions`, didefinisikan di [supabase/schema.sql](../supabase/schema.sql).

### Dua jenis kunci
| Kunci | Kemampuan | Dipakai di |
|---|---|---|
| **anon / publishable** | Hanya yang diizinkan aturan RLS | Browser |
| **service_role / secret** | Segalanya, melewati semua aturan | Server saja |

### RLS (Row Level Security)
Aturan di dalam database tentang siapa boleh melakukan apa. Di project ini: **semua orang boleh membaca, tidak ada yang boleh menulis**, kecuali pemegang service_role. Sudah diuji: percobaan menulis pakai kunci publik ditolak dengan pesan `violates row-level security policy`.

### Cara riwayat dicatat
```
GitHub Actions (tiap 5 menit)
   └─► panggil /api/cron/snapshot (bawa CRON_SECRET)
          ├─ ambil daftar live sekarang
          ├─ live baru            → buat baris baru
          ├─ live masih berjalan  → perbarui last_seen_at & puncak penonton
          └─ live yang hilang     → isi ended_at = last_seen_at (selesai)
```

> 💡 **Insight:** kalau pengambilan data Showroom gagal sesaat, snapshot **tidak** boleh menandai semua live Showroom selesai. Karena itu `fetchLives` melaporkan platform mana yang gagal (`failed`), dan live di platform itu dilewati.

Halaman Riwayat hanya menampilkan live yang sudah selesai. Live yang sedang berjalan baru muncul setelah snapshot berikutnya mendeteksi live tersebut sudah hilang.

---

## 12. Pedoman backend

Frontend mengejar "tampilan sesuai harapan". Backend mengejar **"data benar, aman, dan andal"**. Pakem-pakem yang diterapkan:

1. **Jangan pernah percaya input dari luar.** Siapa pun bisa mengirim permintaan apa pun. Contoh: Worker menolak alamat selain `live-video.net`, dan `api/idn-chat` hanya menerima huruf, angka, titik, dan strip.
2. **Rahasia disimpan di server, jangan ke browser.** Semua yang dikirim ke browser bisa dilihat siapa saja.
3. **Batasi siapa boleh melakukan apa.** `CRON_SECRET` untuk snapshot, dan RLS untuk database.
4. **Pihak luar bisa gagal kapan saja. Siapkan rencana.** Lihat contoh `failed` di bagian 11.
5. **Hemat, dan jangan kerja dua kali.** `api/lives` di-cache 15 detik (`s-maxage=15`), jadi seribu pengunjung dalam 15 detik cuma menghasilkan satu request ke IDN dan Showroom. Video berat tidak lewat server kita.
6. **Server tidak "ingat" apa-apa.** Data yang harus bertahan masuk database.
7. **Sepakati bentuk data.** Frontend dan backend memakai tipe yang sama di [src/lib/types.ts](../src/lib/types.ts). Kalau bentuknya berubah, TypeScript langsung protes.
8. **Ukur, jangan menebak.** Lihat bagian berikutnya.

---

## 13. Pelajaran debugging

### Uji dengan kondisi yang mirip pemakaian sebenarnya
> ⚠️ **Kesalahan nyata:** Sempat disimpulkan "retry 10 kali berhasil 23/24". Ternyata salah, karena pengujiannya memakai **curl yang membuka koneksi baru setiap request**, sedangkan browser memakai ulang koneksi yang sama. Setelah diuji dengan satu koneksi yang dipakai ulang, retry terbukti tidak menolong.

### Pisahkan masalah per lapisan
Saat video gagal, cek satu per satu:
```
Daftar live (/api/lives) → master (Worker) → variant → segment → player
```
Kode status di tiap lapisan memberi tahu letak masalahnya.

### Baca pesan error dengan teliti
- `403` + `content_geoblocked` = kunci wilayah, bukan kesalahan kode
- `404` pada master = live sudah selesai
- `429` = kena limit karena terlalu sering meminta
- Player menerima HTML, bukan playlist = alamat proxy salah (kasus `/hls` di Vercel)

### Bandingkan yang berhasil dengan yang gagal
Kasus "HP bisa, laptop tidak" → apa bedanya? Kasus "proxy publik lolos, Worker kita tidak" → apa bedanya? Pertanyaan perbandingan ini yang akhirnya menuntun ke penyebab sebenarnya.

### Gunakan data, bukan kesan
Mencatat kota Cloudflare (`colo`) di setiap percobaan langsung memperlihatkan pola SIN = lolos, sisanya = gagal.

### Masalah data juga bisa datang dari sumbernya
- **Status live IDN bernilai `null`**, bukan `"live"`. Filter yang hanya menerima `"live"` membuat 7 member yang sedang live tidak muncul. Solusinya: anggap live kalau ada `playback_url` dan `end_at` kosong.
- **Foto Michie ternyata kartu foto Levi.** Cover room Showroom Michie memang dipasang foto Levi. Solusinya: utamakan avatar IDN, dan cek duplikat berdasarkan isi file gambar, bukan alamatnya.
- **Room Showroom Amanda, Alya, dan Auwia sudah tidak ada.** Data pemetaan perlu diperbarui manual.

### Player yang tahan banting
Di [src/components/Player.tsx](../src/components/Player.tsx):
- **Watchdog:** kalau video tidak maju 6 detik, lompat ke ujung siaran. Kalau 15 detik, muat ulang total.
- Percobaan ulang dengan jeda yang makin lama (2, 4, 8, lalu maksimal 15 detik) supaya tidak membanjiri server.
- Mute, volume, dan pilihan kualitas tetap terjaga setelah dimuat ulang.

---

## 14. Batasan dan risiko project ini

### Proxy itu wajar, tapi konten tetap milik IDN
Server perantara adalah pola yang umum dan tidak melanggar tujuan CORS. Tapi CORS yang tidak dibuka berarti IDN memang tidak berniat kontennya ditampilkan di website lain. Fan project seperti ini umumnya dibiarkan selama tidak merugikan. Beban ke kita sudah diminimalkan: video tetap ditonton langsung dari server IDN.

### Soal kunci wilayah
Durable Object Asia membuat **semua** pengunjung lolos, termasuk yang berada di luar Asia. Untuk penonton di Indonesia, ini sesuai maksud IDN. Untuk penonton di luar Asia, ini mengakali kunci wilayah. Opsi yang lebih "bersih": batasi Worker hanya melayani pengunjung dari negara Asia (Cloudflare memberi tahu negara pengunjung).

### Tidak ada jaminan selamanya
| Kalau IDN atau Cloudflare… | Dampak |
|---|---|
| Menambahkan izin CORS ke master | 👍 Worker tidak diperlukan lagi |
| Mewajibkan login/token | ❌ Proxy rusak |
| Memblokir IP data center | ❌ Master gagal semua |
| Mengunci wilayah lebih ketat (khusus Indonesia) | ❌ Live terkunci gagal lagi |
| Mengubah format API GraphQL | ❌ Daftar live kosong, kode perlu disesuaikan |
| Mengubah aturan paket gratis | ⚠️ Mungkin perlu pindah cara |

### Kuota gratis
| Layanan | Batas gratis | Pemakaian kita |
|---|---|---|
| Cloudflare Worker / Durable Object | 100.000 request/hari | ±1 per penonton mulai menonton |
| Vercel | 100 GB bandwidth/bulan | Kecil, video tidak lewat Vercel |
| Supabase | Paket gratis | Satu tabel kecil |

---

## 15. Kronologi perjalanan

1. **Riset website referensi.** jkt48live.github.io ternyata static site dengan 14 proxy publik.
2. **Tentukan arsitektur.** Vercel + Cloudflare Worker + Supabase + GitHub Actions. Jadwal theater dibuang dari scope.
3. **Tes setiap sumber data.** Ketahuan mana yang punya izin CORS dan mana yang tidak. jkt48.com tidak bisa di-scrape (diblokir Cloudflare).
4. **Bangun website.** React, Tailwind, animasi Framer Motion, player, chat, multi-view, riwayat, profil member.
5. **Bug: 7 member live tidak muncul.** Penyebabnya status IDN bernilai `null`.
6. **Ganti nama.** JKT48 Live → Wotalive → **Jeketilive**.
7. **Deploy Worker pertama** dan setup subdomain `workers.dev`.
8. **Kunci Supabase tertukar.** Service role sempat di variabel `VITE_`, lalu diperbaiki.
9. **Bug foto member.** Cover Showroom Michie ternyata foto Levi.
10. **Player macet.** Ditambahkan watchdog dan muat ulang otomatis.
11. **Geoblock 403.** Proxy dibuat hemat (hanya master), lalu dicoba AWS dan Google Cloud, keduanya gagal.
12. **Website online memanggil `/hls`.** Env belum terbaca saat build, diperbaiki dengan isi env lalu redeploy.
13. **"Kadang bisa, kadang enggak."** Investigasi: DNS, VPN, IPv6, sampai ketemu gedung Cloudflare yang menempel di koneksi.
14. **Solusi akhir:** Durable Object di Asia, terbukti 18/18 dengan cara browser.

---

## 16. Kamus istilah

| Istilah | Arti singkat |
|---|---|
| **API** | Pintu yang disediakan sebuah server untuk diminta data oleh program lain |
| **Backend** | Kode yang berjalan di server |
| **Build** | Proses mengubah kode sumber jadi file siap pakai untuk website |
| **Cache** | Simpanan sementara supaya tidak meminta hal yang sama berulang kali |
| **Cloudflare Worker** | Kode kecil yang dijalankan di server-server Cloudflare |
| **Colo** | Kode gedung server Cloudflare (SIN, LAX, dll.) |
| **CORS** | Aturan browser tentang siapa boleh membaca data dari website lain |
| **Cron** | Penjadwal tugas berkala, misalnya tiap 5 menit |
| **Deploy** | Mengunggah kode ke server supaya bisa diakses publik |
| **DNS** | "Buku telepon" internet: nama domain → alamat IP |
| **Durable Object** | Kode Cloudflare yang tinggal di satu lokasi tetap |
| **Env (environment variable)** | Pengaturan atau rahasia yang disimpan di luar kode |
| **Frontend** | Kode yang berjalan di browser pengunjung |
| **Geoblock** | Pembatasan konten berdasarkan lokasi |
| **GraphQL** | Salah satu cara meminta data ke API (dipakai IDN) |
| **HLS** | Cara mengirim video dengan memotongnya jadi file-file kecil |
| **hls.js** | Library pemutar video HLS di browser |
| **IP address** | Alamat perangkat di internet |
| **Master playlist** | File daftar kualitas video yang tersedia |
| **Proxy** | Server perantara |
| **Request / Response** | Permintaan / jawaban |
| **RLS** | Aturan di database tentang siapa boleh membaca atau menulis |
| **Scraping** | Mengambil data dari website secara otomatis |
| **Segment** | Potongan kecil video |
| **Serverless** | Menjalankan fungsi tanpa mengelola server sendiri |
| **Service role key** | Kunci admin database, wajib rahasia |
| **Status code** | Nomor hasil jawaban server (200, 403, dll.) |
| **URI / URL** | Alamat sesuatu di internet |
| **Variant playlist** | File daftar potongan video untuk satu kualitas |
| **WebSocket** | Sambungan dua arah yang terus terbuka, dipakai untuk chat realtime |
