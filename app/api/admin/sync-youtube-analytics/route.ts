import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAccessToken } from '@/lib/youtube-token'

export async function POST() {
  const { data: tokenSetting } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'youtube_refresh_token')
    .single()

  if (!tokenSetting) {
    return NextResponse.json(
      { error: 'YouTube not connected. Click "Connect YouTube" first.' },
      { status: 401 }
    )
  }

  let accessToken: string
  try {
    accessToken = await getAccessToken(tokenSetting.value)
  } catch {
    return NextResponse.json(
      { error: 'Could not refresh YouTube token. Please reconnect.' },
      { status: 401 }
    )
  }

  const now = new Date()
  const startDate = '2025-01-01'
  const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const endDate = lastDayOfCurrentMonth.toISOString().split('T')[0]

  const baseMetrics = 'views,impressions,impressionClickThroughRate,estimatedMinutesWatched,averageViewPercentage,subscribersGained,subscribersLost'
  const withRevenue = baseMetrics + ',estimatedRevenue'

  const buildUrl = (metrics: string) =>
    `https://youtubeanalytics.googleapis.com/v2/reports?` +
    new URLSearchParams({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics,
      dimensions: 'month',
      sort: 'month',
    })

  const authHeader = { Authorization: `Bearer ${accessToken}` }

  let analyticsRes = await fetch(buildUrl(withRevenue), { headers: authHeader })
  let hasRevenue = true

  if (!analyticsRes.ok) {
    // Retry without estimatedRevenue (channel not in YPP)
    analyticsRes = await fetch(buildUrl(baseMetrics), { headers: authHeader })
    hasRevenue = false
    if (!analyticsRes.ok) {
      const err = await analyticsRes.text()
      return NextResponse.json({ error: `Analytics API error: ${err}` }, { status: 502 })
    }
  }

  const analyticsData = await analyticsRes.json()

  // Get current subscriber count
  const channelRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true',
    { headers: authHeader }
  )
  const channelData = await channelRes.json()
  const currentSubscribers = parseInt(
    channelData.items?.[0]?.statistics?.subscriberCount ?? '0'
  )

  // Count videos published per month from our DB
  const { data: videoRows } = await supabaseAdmin
    .from('video_revenue')
    .select('published_at')
    .not('published_at', 'is', null)

  const videosPerMonth: Record<string, number> = {}
  for (const v of videoRows ?? []) {
    if (!v.published_at) continue
    const d = new Date(v.published_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    videosPerMonth[key] = (videosPerMonth[key] ?? 0) + 1
  }

  const columnHeaders: string[] =
    analyticsData.columnHeaders?.map((h: { name: string }) => h.name) ?? []
  const rows: (number | string)[][] = analyticsData.rows ?? []

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const upserts = rows.map(row => {
    const r: Record<string, number | string> = {}
    columnHeaders.forEach((col, i) => { r[col] = row[i] })

    const monthStr = r['month'] as string        // "2025-01"
    const [yearStr, monthNumStr] = monthStr.split('-')
    const year = parseInt(yearStr)
    const month = parseInt(monthNumStr)
    const isCurrentMonth = monthStr === currentMonthKey

    const subscribersGained = Math.round((r['subscribersGained'] as number) ?? 0)
    const subscribersLost = Math.round((r['subscribersLost'] as number) ?? 0)

    return {
      year,
      month,
      videos_published: videosPerMonth[monthStr] ?? 0,
      impressions: Math.round((r['impressions'] as number) ?? 0),
      views: Math.round((r['views'] as number) ?? 0),
      avg_retention_pct: r['averageViewPercentage'] != null
        ? Number((r['averageViewPercentage'] as number).toFixed(2))
        : null,
      avg_ctr_pct: r['impressionClickThroughRate'] != null
        ? Number(((r['impressionClickThroughRate'] as number) * 100).toFixed(2))
        : null,
      subscriber_gain: subscribersGained - subscribersLost,
      total_subscribers: isCurrentMonth ? currentSubscribers : null,
      watch_time_hours: r['estimatedMinutesWatched'] != null
        ? Number(((r['estimatedMinutesWatched'] as number) / 60).toFixed(1))
        : 0,
      estimated_revenue: hasRevenue && r['estimatedRevenue'] != null
        ? Number((r['estimatedRevenue'] as number).toFixed(2))
        : 0,
      is_partial: isCurrentMonth,
      synced_at: new Date().toISOString(),
    }
  })

  if (upserts.length > 0) {
    const { error } = await supabaseAdmin
      .from('monthly_youtube_stats')
      .upsert(upserts, { onConflict: 'year,month' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ synced: upserts.length, hasRevenue })
}
