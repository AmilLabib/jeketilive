// IDN's GraphQL doesn't expose the chat room id, but the live page HTML does.
const SAFE = /^[\w.-]+$/

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const username = params.get('username') ?? ''
  const slug = params.get('slug') ?? ''
  if (!SAFE.test(username) || !SAFE.test(slug)) {
    return Response.json({ error: 'username dan slug wajib diisi' }, { status: 400 })
  }

  const res = await fetch(`https://www.idn.app/${username}/live/${slug}`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  })
  const html = res.ok ? await res.text() : ''
  const chatRoomId = html.match(/"chat_room_id":"([^"]+)"/)?.[1]
  if (!chatRoomId) {
    return Response.json({ error: 'chat_room_id tidak ditemukan' }, { status: 404 })
  }

  return Response.json(
    { chatRoomId },
    { headers: { 'cache-control': 'public, s-maxage=3600' } },
  )
}
