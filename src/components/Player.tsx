import Hls, { type Level } from 'hls.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { playableUrl } from '../lib/api'
import type { ChatMessage } from '../lib/chat'
import type { LiveStream } from '../lib/types'
import { ExpandIcon, ExternalIcon, MuteIcon, PauseIcon, PipIcon, PlayIcon, RefreshIcon, VolumeIcon } from './icons'
import { copyStyles, documentPip } from '../lib/pip'
import PipWindow from './PipWindow'

interface Props {
  stream: LiveStream
  className?: string
  /** Multi-view starts extra players muted so audio doesn't overlap. */
  startMuted?: boolean
  /**
   * Enables picture-in-picture (button + automatic on tab switch). In Chrome these comments are
   * overlaid on the floating window; other browsers fall back to plain video PiP.
   */
  comments?: ChatMessage[]
}

// Stall recovery: if playback doesn't advance, first jump to the live edge, then reload the source.
const JUMP_AFTER_S = 6
const RELOAD_AFTER_S = 15
const retryDelay = (attempt: number) => Math.min(2000 * 2 ** attempt, 15_000)
// The worker fetches the master from Asia so IDN's region check should pass (see
// worker/hls-proxy.ts); a 403 is still retried a few times as a safety net.
const GEO_RETRIES = 10
const GEO_RETRY_DELAY_MS = 300
const HIDE_CONTROLS_MS = 5000
/** Further than this behind the live edge, the Live badge turns into a "jump to live" button. */
const BEHIND_LIVE_S = 10

/** Where "live" is: hls.js' sync point, or a few seconds before the end of the stream (Safari). */
const liveEdge = (video: HTMLVideoElement, hls: Hls | null) =>
  hls?.liveSyncPosition ?? (video.seekable.length ? video.seekable.end(0) - 3 : null)

export default function Player({ stream, className = '', startMuted = false, comments }: Props) {
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
  const [behind, setBehind] = useState(false)
  const retriesRef = useRef(0)
  const geoRetriesRef = useRef(0)
  const levelRef = useRef(-1)
  const [pipWin, setPipWin] = useState<Window | null>(null)
  const pipEnabled = comments !== undefined && (!!documentPip() || !!document.pictureInPictureEnabled)

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
      const edge = liveEdge(video, hls)
      setBehind(edge !== null && edge - video.currentTime > BEHIND_LIVE_S)
      if (video.paused || video.currentTime !== lastTime) {
        lastTime = video.currentTime
        stalledFor = 0
        return
      }
      stalledFor++
      if (stalledFor === JUMP_AFTER_S) {
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
  const goLive = () => {
    const edge = liveEdge(video(), hlsRef.current)
    if (edge !== null) video().currentTime = edge
    video().play()
    setBehind(false)
  }
  const fullscreen = () => {
    if (document.fullscreenElement) return document.exitFullscreen()
    const wrap = wrapRef.current!
    if (wrap.requestFullscreen) return wrap.requestFullscreen()
    // iPhone (every iOS browser is WebKit) can only put the <video> itself in fullscreen.
    ;(video() as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.()
  }

  // Hide the controls after a few seconds without mouse/touch/keyboard activity.
  const [idle, setIdle] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wake = () => {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), HIDE_CONTROLS_MS)
  }
  useEffect(() => () => clearTimeout(idleTimer.current), [])

  const vertical = stream.platform === 'idn'
  const openPip = useCallback(async () => {
    const pip = documentPip()
    if (!pip) return videoRef.current!.requestPictureInPicture()
    const win = await pip.requestWindow(vertical ? { width: 300, height: 533 } : { width: 480, height: 270 })
    copyStyles(win.document)
    win.addEventListener('pagehide', () => setPipWin(null))
    setPipWin(win)
  }, [vertical])

  // Chrome calls this when the user switches tabs while the video plays with sound, like Google Meet.
  useEffect(() => {
    if (!pipEnabled) return
    const action = 'enterpictureinpicture' as MediaSessionAction
    try {
      navigator.mediaSession.setActionHandler(action, () => void openPip())
    } catch {
      return // Browser doesn't support automatic picture-in-picture.
    }
    return () => navigator.mediaSession.setActionHandler(action, null)
  }, [pipEnabled, openPip])

  // Leaving the page closes the floating window.
  useEffect(() => () => pipWin?.close(), [pipWin])

  return (
    <div
      ref={wrapRef}
      onPointerMove={wake}
      onPointerDown={wake}
      onKeyDown={wake}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setIdle(true)}
      className={`relative overflow-hidden bg-black ${className}`}
    >
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true)
          wake()
        }}
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

      {pipWin && comments && (
        <>
          <PipWindow win={pipWin} videoRef={videoRef} stream={stream} comments={comments} />
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="space-y-3">
              <p className="text-sm text-white/75">Sedang diputar di jendela picture-in-picture.</p>
              <button
                onClick={() => pipWin.close()}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                Kembalikan ke sini
              </button>
            </div>
          </div>
        </>
      )}

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
        className={`absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-black/85 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 ${playing && idle ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
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
        <button
          onClick={goLive}
          disabled={!behind}
          title={behind ? 'Lompat ke siaran terbaru' : 'Sedang menonton siaran terbaru'}
          className={`ml-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${behind ? 'bg-white/15 text-white/70 hover:bg-brand hover:text-white' : ''}`}
        >
          <span className={`size-1.5 rounded-full ${behind ? 'bg-white/60' : 'animate-live-ring bg-brand'}`} /> Live
        </button>

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
          {pipEnabled && !pipWin && (
            <button
              onClick={() => void openPip()}
              className="grid size-9 place-items-center rounded-full hover:bg-white/15"
              aria-label="Picture-in-picture"
              title="Picture-in-picture"
            >
              <PipIcon />
            </button>
          )}
          <button onClick={fullscreen}className="grid size-9 place-items-center rounded-full hover:bg-white/15" aria-label="Layar penuh">
            <ExpandIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
