import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const isYouTubeSource = (video_id: string) =>
  /^\d+$/.test(video_id) || video_id === 'pin'

const PAGE_SIZE = 1000

// Supabase returns at most 1000 rows per request. link_clicks grew past that
// (frozen the dashboard at ~1000 clicks), so page through every row.
async function fetchAllClicks(from: string | null, to: string | null) {
  const all: { video_id: string; destination: string }[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    let q = supabaseAdmin
      .from('link_clicks')
      .select('video_id, destination')
      .order('id', { ascending: true })
      .range(start, start + PAGE_SIZE - 1)

    if (from) q = q.gte('clicked_at', from)
    if (to)   q = q.lte('clicked_at', to)

    const { data, error } = await q
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return all
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let clicks: { video_id: string; destination: string }[]
  try {
    clicks = await fetchAllClicks(from, to)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load clicks' },
      { status: 500 }
    )
  }

  const { data: revenues } = await supabaseAdmin
    .from('video_revenue')
    .select('video_id, revenue, views, published_at, title')

  const statsMap: Record<string, { call: number; webinar: number; quiz: number; guide: number; total: number; revenue: number; views: number; published_at: string | null; title: string | null }> = {}

  for (const click of (clicks || [])) {
    if (!isYouTubeSource(click.video_id)) continue
    if (!statsMap[click.video_id]) {
      statsMap[click.video_id] = { call: 0, webinar: 0, quiz: 0, guide: 0, total: 0, revenue: 0, views: 0, published_at: null, title: null }
    }
    statsMap[click.video_id][click.destination as 'call' | 'webinar' | 'quiz' | 'guide']++
    statsMap[click.video_id].total++
  }

  for (const rev of (revenues || [])) {
    if (statsMap[rev.video_id]) {
      statsMap[rev.video_id].revenue = rev.revenue ?? 0
      statsMap[rev.video_id].views = rev.views ?? 0
      statsMap[rev.video_id].published_at = rev.published_at ?? null
      statsMap[rev.video_id].title = rev.title ?? null
    }
  }

  const stats = Object.entries(statsMap)
    .map(([video_id, data]) => ({ video_id, ...data }))
    .sort((a, b) => {
      // numeric IDs sort numerically; 'pin' goes at top
      if (a.video_id === 'pin') return -1
      if (b.video_id === 'pin') return 1
      return parseInt(a.video_id) - parseInt(b.video_id)
    })

  return NextResponse.json({ stats })
}
