import { fetchLives } from './_lib/lives.js'

export async function GET() {
  return Response.json(await fetchLives(), {
    headers: { 'cache-control': 'public, s-maxage=15, stale-while-revalidate=30' },
  })
}
