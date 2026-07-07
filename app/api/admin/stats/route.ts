import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const isYouTubeSource = (video_id: string) =>
  /^\d+$/.test(video_id) || video_id === 'pin'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let clicksQuery = supabaseAdmin
    .from('link_clicks')
    .select('video_id, destination')

  if (from) clicksQuery = clicksQuery.gte('clicked_at', from)
  if (to)   clicksQuery = clicksQuery.lte('clicked_at', to)

  const { data: clicks, error: clicksError } = await clicksQuery

  if (clicksError) {
    return NextResponse.json({ error: clicksError.message }, { status: 500 })
  }

  const { data: revenues } = await supabaseAdmin
    .from('video_revenue')
    .select('video_id, revenue, views')

  const statsMap: Record<string, { call: number; webinar: number; quiz: number; guide: number; total: number; revenue: number; views: number }> = {}

  for (const click of (clicks || [])) {
    if (!isYouTubeSource(click.video_id)) continue
    if (!statsMap[click.video_id]) {
      statsMap[click.video_id] = { call: 0, webinar: 0, quiz: 0, guide: 0, total: 0, revenue: 0, views: 0 }
    }
    statsMap[click.video_id][click.destination as 'call' | 'webinar' | 'quiz' | 'guide']++
    statsMap[click.video_id].total++
  }

  for (const rev of (revenues || [])) {
    if (statsMap[rev.video_id]) {
      statsMap[rev.video_id].revenue = rev.revenue ?? 0
      statsMap[rev.video_id].views = rev.views ?? 0
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
