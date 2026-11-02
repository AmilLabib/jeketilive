import type { LiveStream } from './types'

export interface ChatMessage {
  id: number
  name: string
  text: string
  avatar: string
}

export type ChatStatus = 'connecting' | 'live' | 'error'

let nextId = 0

function decodeEntities(value: string) {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

// IDN sends the comment either as a string or as an object with a text field.
function commentText(value: unknown): string {
  if (typeof value === 'string') return decodeEntities(value)
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    const text = [v.message, v.text, v.body, v.content].find((c) => typeof c === 'string' && c.trim())
    if (typeof text === 'string') return decodeEntities(text)
  }
  return ''
}

function openShowroom(key: string, push: (m: ChatMessage) => void) {
  const socket = new WebSocket('wss://online.showroom-live.com/')
  const ping = setInterval(() => socket.readyState === WebSocket.OPEN && socket.send('PING\tshowroom'), 30_000)
  socket.addEventListener('open', () => socket.send(`SUB\t${key}`))
  socket.addEventListener('message', (event) => {
    const json = String(event.data).match(/\{.*\}/)?.[0]
    if (!json) return
    const data = JSON.parse(json)
    if (Number(data.t) !== 1) return
    push({
      id: nextId++,
      name: data.ac || 'Penonton',
      text: decodeEntities(String(data.cm ?? '')),
      avatar: data.av ? `https://static.showroom-live.com/image/avatar/${data.av}.png` : '',
    })
  })
  socket.addEventListener('close', () => clearInterval(ping))
  return socket
}

// IDN chat is IRC over WebSocket; the comment JSON is the PRIVMSG body.
function openIdn(roomId: string, push: (m: ChatMessage) => void) {
  const socket = new WebSocket('wss://chat.idn.app/')
  const user = crypto.randomUUID().split('-')[0]
  const prefix = `PRIVMSG #${roomId} :`
  socket.addEventListener('open', () => {
    socket.send('CAP LS 302')
    socket.send(`NICK idn-${user}-${Date.now()}`)
    socket.send(`USER ${user}_${crypto.randomUUID()} 0 * null`)
    socket.send('CAP END')
  })
  socket.addEventListener('message', (event) => {
    const payload = String(event.data)
    if (payload.includes(':Welcome')) return socket.send(`JOIN #${roomId}`)
    if (payload.startsWith('PING')) return socket.send(`PONG ${payload.slice(5)}`)
    const index = payload.indexOf(prefix)
    if (index < 0) return
    try {
      const data = JSON.parse(payload.slice(index + prefix.length))
      const text = commentText(data.chat)
      if (!text) return
      push({
        id: nextId++,
        name: data.user?.name || data.user?.username || 'Penonton',
        text,
        avatar: data.user?.avatar_url || '',
      })
    } catch {
      // Non-JSON PRIVMSG (system notices) – ignore.
    }
  })
  return socket
}

type ChatTarget = Pick<LiveStream, 'platform' | 'roomId' | 'showroomChatKey' | 'idnUsername'>

async function idnChatRoomId(stream: ChatTarget) {
  const params = new URLSearchParams({ username: stream.idnUsername ?? '', slug: stream.roomId })
  const res = await fetch(`/api/idn-chat?${params}`)
  if (!res.ok) throw new Error('chat_room_id tidak ditemukan')
  return ((await res.json()) as { chatRoomId: string }).chatRoomId
}

/** Connects to the stream's comment feed and reconnects on drop. Returns a disconnect function. */
export function connectChat(
  stream: ChatTarget,
  onMessage: (m: ChatMessage) => void,
  onStatus: (s: ChatStatus) => void,
) {
  let socket: WebSocket | null = null
  let retry: ReturnType<typeof setTimeout> | undefined
  let closed = false

  const connect = async () => {
    onStatus('connecting')
    try {
      socket =
        stream.platform === 'showroom'
          ? openShowroom(stream.showroomChatKey ?? '', onMessage)
          : openIdn(await idnChatRoomId(stream), onMessage)
    } catch {
      onStatus('error')
      return
    }
    if (closed) return socket.close()
    socket.addEventListener('open', () => onStatus('live'))
    socket.addEventListener('close', () => {
      if (closed) return
      onStatus('connecting')
      retry = setTimeout(connect, 3000)
    })
  }

  connect()
  return () => {
    closed = true
    clearTimeout(retry)
    socket?.close()
  }
}
