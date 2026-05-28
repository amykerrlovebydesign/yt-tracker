import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  // Get all clicks
  const { data: clicks, error: clicksError } = await supabaseAdmin
    .from('link_clicks')
    .select('video_id, destination')

  if (clicksError) {
    return NextResponse.json({ error: clicksError.message }, { status: 500 })
  }

  // Get all revenue entries
  const { data: revenues } = await supabaseAdmin
    .from('video_revenue')
    .select('video_id, revenue')

  // Build stats per video
  const statsMap: Record<string, { call: number; webinar: number; quiz: number; guide: number; total: number; revenue: number }> = {}

  for (const click of (clicks || [])) {
    if (!statsMap[click.video_id]) {
      statsMap[click.video_id] = { call: 0, webinar: 0, quiz: 0, guide: 0, total: 0, revenue: 0 }
    }
    statsMap[click.video_id][click.destination as 'call' | 'webinar' | 'quiz' | 'guide']++
    statsMap[click.video_id].total++
  }

  for (const rev of (revenues || [])) {
    if (statsMap[rev.video_id]) {
      statsMap[rev.video_id].revenue = rev.revenue
    }
  }

  const stats = Object.entries(statsMap)
    .map(([video_id, data]) => ({ video_id, ...data }))
    .sort((a, b) => a.video_id.localeCompare(b.video_id))

  return NextResponse.json({ stats })
}
