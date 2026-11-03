import Hls, { type Level } from 'hls.js'
import { useEffect, useRef, useState } from 'react'
import { playableUrl } from '../lib/api'
import type { LiveStream } from '../lib/types'
import { ExpandIcon, ExternalIcon, MuteIcon, PauseIcon, PlayIcon, RefreshIcon, VolumeIcon } from './icons'

interface Props {
  stream: LiveStream
  className?: string
  /** Multi-view starts extra players muted so audio doesn't overlap. */
  startMuted?: boolean
}

// Stall recovery: if playback doesn't advance, first jump to the live edge, then reload the source.
const JUMP_AFTER_S = 6
const RELOAD_AFTER_S = 15
const retryDelay = (attempt: number) => Math.min(2000 * 2 ** attempt, 15_000)
// IDN's region check on the master playlist passes or fails per request depending on which
// Cloudflare egress IP the proxy gets, so a 403 is retried quickly a few times first.
const GEO_RETRIES = 10
const GEO_RETRY_DELAY_MS = 300

export default function Player({ stream, className = '', startMuted = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(startMuted)
  const [volume, setVolume] = useState(1)
  const [buffering, setBuffering] = useState(true)
  const [levels, setLevels] = useState<Level[]>([])
  const [level, setLevel] = useState(-1)
  /** Bumping this re-runs the load effect, i.e. a full reload of the source. */
  const [attempt, setAttempt] = useState(0)
  const [reconnecting, setReconnecting] = useState(false)
  /** IDN region-locked the stream (master playlist 403) even after GEO_RETRIES attempts. */
  const [blocked, setBlocked] = useState(false)
  const retriesRef = useRef(0)
  const geoRetriesRef = useRef(0)
  const levelRef = useRef(-1)

  const src = playableUrl(stream)

  useEffect(() => {
    const video = videoRef.current!
    // The <video> element survives reloads, so only apply the initial mute once.
    if (attempt === 0) video.muted = startMuted

    let reloadTimer: ReturnType<typeof setTimeout> | undefined
    const reload = (delay = retryDelay(retriesRef.current++)) => {
      if (reloadTimer) return
      setReconnecting(true)
      reloadTimer = setTimeout(() => setAttempt((a) => a + 1), delay)
    }
    const onNativeError = () => reload()

    // Browsers block unmuted autoplay without a prior click; fall back to muted.
    const start = () =>
      video.play().catch(() => {
        video.muted = true
        setMuted(true)
        video.play().catch(() => {})
      })

    let hls: Hls | null = null
    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, enableWorker: true })
      hlsRef.current = hls
      let mediaRecovered = false
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setLevels(data.levels)
        hls!.currentLevel = levelRef.current
        start()
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return
        if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR && data.response?.code === 403) {
          if (geoRetriesRef.current++ < GEO_RETRIES) reload(GEO_RETRY_DELAY_MS)
          else setBlocked(true)
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecovered) {
          mediaRecovered = true
          hls!.recoverMediaError()
        } else {
          reload()
        }
      })
      hls.loadSource(src)
      hls.attachMedia(video)
    } else {
      video.src = src // Safari plays HLS natively
      video.addEventListener('error', onNativeError)
      start()
    }

    // Watchdog: a live stream that isn't paused should always be advancing.
    let lastTime = -1
    let stalledFor = 0
    const watchdog = setInterval(() => {
      if (video.paused || video.currentTime !== lastTime) {
        lastTime = video.currentTime
        stalledFor = 0
        return
      }
      stalledFor++
      if (stalledFor === JUMP_AFTER_S) {
        const edge = hls?.liveSyncPosition ?? (video.seekable.length ? video.seekable.end(0) - 3 : null)
        if (edge) video.currentTime = edge
      } else if (stalledFor >= RELOAD_AFTER_S) {
        reload()
      }
    }, 1000)

    return () => {
      clearInterval(watchdog)
      clearTimeout(reloadTimer)
      video.removeEventListener('error', onNativeError)
      if (hls) {
        hls.destroy()
        hlsRef.current = null
      } else {
        video.removeAttribute('src')
        video.load()
      }
    }
  }, [src, startMuted, attempt])

  const video = () => videoRef.current!
  const togglePlay = () => (video().paused ? video().play() : video().pause())
  const toggleMute = () => {
    video().muted = !muted
    setMuted(!muted)
  }
  const changeVolume = (value: number) => {
    video().volume = value
    video().muted = value === 0
    setVolume(value)
    setMuted(value === 0)
  }
  const changeLevel = (value: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = value
    levelRef.current = value
    setLevel(value)
  }
  const fullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : wrapRef.current?.requestFullscreen()

  return (
    <div ref={wrapRef} className={`group relative overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => {
          setBuffering(false)
          setReconnecting(false)
          retriesRef.current = 0
          geoRetriesRef.current = 0
        }}
        className="size-full object-contain"
      />

      {blocked && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/80 p-6 text-center">
          <div className="max-w-xs space-y-3">
            <p className="text-sm text-white/85">
              Live ini dikunci IDN khusus penonton dari Indonesia dan barusan gagal dimuat. Coba lagi, atau tonton
              langsung di IDN.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  geoRetriesRef.current = 0
                  setBlocked(false)
                  setAttempt((a) => a + 1)
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                <RefreshIcon width={15} height={15} /> Coba lagi
              </button>
              <a
                href={stream.roomUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/85"
              >
                <ExternalIcon width={15} height={15} /> Tonton di IDN
              </a>
            </div>
          </div>
        </div>
      )}
      {!blocked && (buffering || reconnecting) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <span className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
            {reconnecting && (
              <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur">
                Menyambungkan ulang… (percobaan {attempt + 1})
              </span>
            )}
          </div>
        </div>
      )}
      {muted && playing && (
        <button
          onClick={toggleMute}
          className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs backdrop-blur hover:bg-brand"
        >
          <MuteIcon width={14} height={14} /> Ketuk untuk menyalakan suara
        </button>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-black/85 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 ${playing ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`}
      >
        <button onClick={togglePlay} className="grid size-9 place-items-center rounded-full hover:bg-white/15" aria-label={playing ? 'Jeda' : 'Putar'}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button onClick={toggleMute} className="grid size-9 place-items-center rounded-full hover:bg-white/15" aria-label="Suara">
          {muted ? <MuteIcon /> : <VolumeIcon />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          className="hidden w-20 accent-brand sm:block"
          aria-label="Volume"
        />
        <span className="ml-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <span className="size-1.5 animate-live-ring rounded-full bg-brand" /> Live
        </span>

        <div className="ml-auto flex items-center gap-1">
          {levels.length > 1 && (
            <select
              value={level}
              onChange={(e) => changeLevel(Number(e.target.value))}
              className="rounded-md bg-black/50 px-2 py-1 text-xs outline-none ring-1 ring-white/15"
              aria-label="Kualitas"
            >
              <option value={-1}>Auto</option>
              {levels.map((l, i) => (
                <option key={i} value={i}>
                  {l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)} kbps`}
                </option>
              ))}
            </select>
          )}
          <button onClick={fullscreen} className="grid size-9 place-items-center rounded-full hover:bg-white/15" aria-label="Layar penuh">
            <ExpandIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
