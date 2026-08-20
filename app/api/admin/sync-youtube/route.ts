import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { VIDEO_MAP } from '@/lib/videos'

function extractVideoId(url?: string): string | null {
  if (!url) return null
  const match = url.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}

export async function POST() {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'YOUTUBE_API_KEY not set' }, { status: 500 })

  // Build map of YouTube video ID → tracking video_id
  const ytIdToTrackingId: Record<string, string> = {}
  for (const [trackingId, info] of Object.entries(VIDEO_MAP)) {
    const ytId = extractVideoId(info.url)
    if (ytId) ytIdToTrackingId[ytId] = trackingId
  }

  const ytIds = Object.keys(ytIdToTrackingId)
  if (ytIds.length === 0) return NextResponse.json({ synced: 0 })

  // YouTube API allows up to 50 IDs per request
  const BATCH = 50
  const updates: { tracking_id: string; views: number; published_at: string | null; title: string | null }[] = []

  for (let i = 0; i < ytIds.length; i += BATCH) {
    const batch = ytIds.slice(i, i + BATCH)
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${batch.join(',')}&key=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `YouTube API error: ${err}` }, { status: 502 })
    }
    const data = await res.json()
    for (const item of (data.items || [])) {
      const trackingId = ytIdToTrackingId[item.id]
      const views = parseInt(item.statistics?.viewCount ?? '0', 10)
      const published_at = item.snippet?.publishedAt ?? null
      const title = item.snippet?.title ?? null
      if (trackingId) updates.push({ tracking_id: trackingId, views, published_at, title })
    }
  }

  // Upsert all view counts and publish dates
  for (const { tracking_id, views, published_at, title } of updates) {
    await supabaseAdmin
      .from('video_revenue')
      .upsert({ video_id: tracking_id, views, published_at, title }, { onConflict: 'video_id' })
  }

  return NextResponse.json({ synced: updates.length })
}
