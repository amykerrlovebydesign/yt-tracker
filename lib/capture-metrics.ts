import { supabaseAdmin } from './supabase'
import { getAccessToken } from './youtube-token'
import { VIDEO_MAP } from './videos'

// How many videos to process per invocation (keeps us under function timeouts).
const BATCH = 12
const WINDOW_DAYS = 7

function extractVideoId(url?: string): string | null {
  if (!url) return null
  const m = url.match(/[?&]v=([^&]+)/)
  return m ? m[1] : null
}

/** ISO 8601 duration (PT#H#M#S) → seconds. */
function isoDurationToSeconds(iso?: string): number | null {
  if (!iso) return null
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return null
  const [, h, mi, s] = m
  return (parseInt(h || '0') * 3600) + (parseInt(mi || '0') * 60) + parseInt(s || '0')
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

const TRAFFIC_LABELS: Record<string, string> = {
  BROWSE: 'Browse', YT_SEARCH: 'Search', SUGGESTED: 'Suggested', PLAYLIST: 'Playlist',
  NOTIFICATION: 'Notifications', EXT_URL: 'External', SHORTS: 'Shorts', YT_CHANNEL: 'Channel page',
  SUBSCRIBER: 'Subscriptions feed', NO_LINK_OTHER: 'Other', ADVERTISING: 'Advertising',
}

interface AnalyticsResult {
  columnHeaders?: { name: string }[]
  rows?: (number | string)[][]
}

async function analytics(
  token: string,
  ytId: string,
  startDate: string,
  endDate: string,
  metrics: string,
  dimensions?: string
): Promise<AnalyticsResult> {
  const params = new URLSearchParams({
    ids: 'channel==MINE',
    startDate,
    endDate,
    metrics,
    filters: `video==${ytId}`,
  })
  if (dimensions) params.set('dimensions', dimensions)
  const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/** Turn a flat single-row analytics report into a {metric: value} map. */
function rowToMap(data: AnalyticsResult): Record<string, number> {
  const headers = data.columnHeaders?.map((h) => h.name) ?? []
  const row = data.rows?.[0] ?? []
  const out: Record<string, number> = {}
  headers.forEach((h, i) => (out[h] = Number(row[i] ?? 0)))
  return out
}

export interface CaptureResult {
  captured: number
  remaining: number
  errors: string[]
}

/**
 * Capture a one-time 7-day snapshot for every video that is now >= 7 days old
 * and hasn't been captured yet. Processes up to BATCH videos per call and
 * reports how many remain, so a large backfill can be run in several clicks.
 */
export async function captureDueSnapshots(): Promise<CaptureResult> {
  const apiKey = process.env.YOUTUBE_API_KEY
  const { data: tokenSetting } = await supabaseAdmin
    .from('settings').select('value').eq('key', 'youtube_refresh_token').single()
  if (!tokenSetting) throw new Error('YouTube not connected. Connect YouTube Analytics first.')
  const token = await getAccessToken(tokenSetting.value)

  const { data: existing } = await supabaseAdmin.from('video_metrics_snapshots').select('video_id')
  const done = new Set((existing ?? []).map((r) => r.video_id as string))

  const { data: revs } = await supabaseAdmin
    .from('video_revenue').select('video_id, published_at, title')
  const pubById: Record<string, { published_at: string | null; title: string | null }> = {}
  for (const r of revs ?? []) pubById[r.video_id as string] = { published_at: r.published_at, title: r.title }

  const now = Date.now()
  const cutoff = now - WINDOW_DAYS * 86400_000

  // Build the due list: mapped videos, >= 7 days old, not yet captured.
  const due: { trackingId: string; ytId: string; published: Date; title: string | null }[] = []
  for (const [trackingId, info] of Object.entries(VIDEO_MAP)) {
    if (done.has(trackingId)) continue
    const ytId = extractVideoId(info.url)
    if (!ytId) continue
    const pub = pubById[trackingId]?.published_at
    if (!pub) continue
    const published = new Date(pub)
    if (published.getTime() > cutoff) continue // not 7 days old yet
    due.push({ trackingId, ytId, published, title: pubById[trackingId]?.title ?? info.title ?? null })
  }

  const batch = due.slice(0, BATCH)
  const errors: string[] = []
  let captured = 0

  for (const v of batch) {
    try {
      const start = ymd(v.published)
      const end = ymd(new Date(v.published.getTime() + WINDOW_DAYS * 86400_000))

      // Duration (Data API)
      let durationSeconds: number | null = null
      try {
        const dRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${v.ytId}&key=${apiKey}`
        )
        const dJson = await dRes.json()
        durationSeconds = isoDurationToSeconds(dJson.items?.[0]?.contentDetails?.duration)
      } catch { /* leave null */ }

      // Core metrics (fall back without impressions if the channel/video doesn't support them)
      let core: Record<string, number> = {}
      try {
        core = rowToMap(await analytics(token, v.ytId, start, end,
          'views,estimatedMinutesWatched,averageViewPercentage,subscribersGained,impressions,impressionClickThroughRate'))
      } catch {
        try {
          core = rowToMap(await analytics(token, v.ytId, start, end,
            'views,estimatedMinutesWatched,averageViewPercentage,subscribersGained'))
        } catch (e) { throw new Error(`core metrics: ${e instanceof Error ? e.message : e}`) }
      }

      // Per-source (browse / suggested / search) CTR + top source — best effort
      let browseCtr: number | null = null, suggestedCtr: number | null = null, searchCtr: number | null = null
      let topSource: string | null = null
      try {
        const src = await analytics(token, v.ytId, start, end,
          'views,impressions,impressionClickThroughRate', 'insightTrafficSourceType')
        const headers = src.columnHeaders?.map((h) => h.name) ?? []
        const iSrc = headers.indexOf('insightTrafficSourceType')
        const iViews = headers.indexOf('views')
        const iCtr = headers.indexOf('impressionClickThroughRate')
        let best = -1
        for (const row of src.rows ?? []) {
          const type = String(row[iSrc])
          const ctr = iCtr >= 0 ? Number(row[iCtr]) : null
          if (type === 'BROWSE') browseCtr = ctr
          else if (type === 'SUGGESTED') suggestedCtr = ctr
          else if (type === 'YT_SEARCH') searchCtr = ctr
          const views = Number(row[iViews] ?? 0)
          if (views > best) { best = views; topSource = TRAFFIC_LABELS[type] ?? type }
        }
      } catch { /* leave nulls */ }

      // Views split by subscribed status — best effort
      let viewsSubscribed: number | null = null, viewsUnsubscribed: number | null = null
      try {
        const sub = await analytics(token, v.ytId, start, end, 'views', 'subscribedStatus')
        const headers = sub.columnHeaders?.map((h) => h.name) ?? []
        const iStatus = headers.indexOf('subscribedStatus')
        const iViews = headers.indexOf('views')
        for (const row of sub.rows ?? []) {
          const status = String(row[iStatus])
          const views = Number(row[iViews] ?? 0)
          if (status === 'SUBSCRIBED') viewsSubscribed = views
          else if (status === 'UNSUBSCRIBED') viewsUnsubscribed = views
        }
      } catch { /* leave nulls */ }

      const impressions = core.impressions != null ? Math.round(core.impressions) : null
      const round1 = (n: number | undefined) => (n != null ? Math.round(n * 10) / 10 : null)

      await supabaseAdmin.from('video_metrics_snapshots').upsert({
        video_id: v.trackingId,
        youtube_id: v.ytId,
        title: v.title,
        published_at: v.published.toISOString(),
        window_start: start,
        window_end: end,
        duration_seconds: durationSeconds,
        views: core.views != null ? Math.round(core.views) : null,
        impressions,
        ctr: round1(core.impressionClickThroughRate),
        browse_ctr: round1(browseCtr ?? undefined),
        suggested_ctr: round1(suggestedCtr ?? undefined),
        search_ctr: round1(searchCtr ?? undefined),
        avg_view_pct: round1(core.averageViewPercentage),
        watch_time_hours: core.estimatedMinutesWatched != null
          ? Math.round((core.estimatedMinutesWatched / 60) * 10) / 10 : null,
        subscribers_gained: core.subscribersGained != null ? Math.round(core.subscribersGained) : null,
        views_subscribed: viewsSubscribed,
        views_unsubscribed: viewsUnsubscribed,
        impressions_per_day: impressions != null ? Math.round((impressions / WINDOW_DAYS) * 10) / 10 : null,
        top_traffic_source: topSource,
      }, { onConflict: 'video_id' })

      captured++
    } catch (e) {
      errors.push(`#${v.trackingId}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { captured, remaining: Math.max(0, due.length - captured), errors }
}
