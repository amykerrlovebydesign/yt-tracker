'use client'

import { useEffect, useState } from 'react'

interface Snapshot {
  video_id: string
  youtube_id: string | null
  title: string | null
  published_at: string | null
  duration_seconds: number | null
  views: number | null
  impressions: number | null
  ctr: number | null
  browse_ctr: number | null
  suggested_ctr: number | null
  search_ctr: number | null
  avg_view_pct: number | null
  watch_time_hours: number | null
  subscribers_gained: number | null
  views_subscribed: number | null
  views_unsubscribed: number | null
  impressions_per_day: number | null
  top_traffic_source: string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDuration(s: number | null) {
  if (s == null) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  return `${h ? h + ':' : ''}${mm}:${String(sec).padStart(2, '0')}`
}
function num(n: number | null) {
  return n == null ? '—' : n.toLocaleString()
}
function pct(n: number | null) {
  return n == null ? '—' : `${n}%`
}

export default function VideoMetricsPanel({ password }: { password: string }) {
  const [rows, setRows] = useState<Snapshot[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [captureMsg, setCaptureMsg] = useState('')

  const load = () => {
    setLoading(true)
    fetch(`/api/admin/video-metrics?password=${encodeURIComponent(password)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setRows(d.rows || [])
      })
      .catch(() => setError('Could not load metrics.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [password])

  const capture = async () => {
    setCapturing(true)
    setCaptureMsg('')
    try {
      const res = await fetch(`/api/admin/capture-metrics?password=${encodeURIComponent(password)}`, { method: 'POST' })
      const d = await res.json()
      if (!d.ok) {
        setCaptureMsg(`Error: ${d.error || 'capture failed'}`)
      } else {
        const errNote = d.errors?.length ? ` · ${d.errors.length} skipped` : ''
        setCaptureMsg(
          d.remaining > 0
            ? `Captured ${d.captured}. ${d.remaining} still due — click again to continue.${errNote}`
            : `Captured ${d.captured}. All caught up.${errNote}`
        )
        load()
      }
    } catch {
      setCaptureMsg('Capture failed.')
    }
    setCapturing(false)
  }

  const COLS: { key: keyof Snapshot | 'sub_split'; label: string; render: (r: Snapshot) => React.ReactNode; align?: string }[] = [
    { key: 'video_id', label: '#', render: (r) => <span className="font-mono text-gray-400">#{r.video_id}</span> },
    { key: 'title', label: 'Name of video', render: (r) => r.youtube_id
        ? <a href={`https://youtu.be/${r.youtube_id}`} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-rose-600">{r.title || 'Untitled'}</a>
        : (r.title || '—') },
    { key: 'published_at', label: 'Date', render: (r) => fmtDate(r.published_at), align: 'right' },
    { key: 'duration_seconds', label: 'Time', render: (r) => fmtDuration(r.duration_seconds), align: 'right' },
    { key: 'ctr', label: 'CTR', render: (r) => pct(r.ctr), align: 'right' },
    { key: 'browse_ctr', label: 'Browse', render: (r) => pct(r.browse_ctr), align: 'right' },
    { key: 'suggested_ctr', label: 'Sugg', render: (r) => pct(r.suggested_ctr), align: 'right' },
    { key: 'search_ctr', label: 'Search', render: (r) => pct(r.search_ctr), align: 'right' },
    { key: 'avg_view_pct', label: 'Reten', render: (r) => pct(r.avg_view_pct), align: 'right' },
    { key: 'watch_time_hours', label: 'Watch hrs', render: (r) => (r.watch_time_hours == null ? '—' : `${r.watch_time_hours}h`), align: 'right' },
    { key: 'subscribers_gained', label: 'Subs', render: (r) => num(r.subscribers_gained), align: 'right' },
    { key: 'views', label: 'Views', render: (r) => num(r.views), align: 'right' },
    { key: 'impressions', label: 'Imps', render: (r) => num(r.impressions), align: 'right' },
    { key: 'views_unsubscribed', label: 'Non-subs', render: (r) => num(r.views_unsubscribed), align: 'right' },
    { key: 'sub_split', label: 'Subs (views)', render: (r) => num(r.views_subscribed), align: 'right' },
    { key: 'impressions_per_day', label: 'Velocity', render: (r) => (r.impressions_per_day == null ? '—' : `${r.impressions_per_day}/d`), align: 'right' },
    { key: 'top_traffic_source', label: 'Top source', render: (r) => r.top_traffic_source || '—' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-gray-400 max-w-lg">
          A one-time snapshot of each video&apos;s first 7 days, captured automatically 7 days after it&apos;s posted.
          Use &ldquo;Capture due&rdquo; to fill in any that are ready now (runs in batches — click again if more remain).
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {captureMsg && <span className="text-xs text-gray-500">{captureMsg}</span>}
          <button
            onClick={capture}
            disabled={capturing}
            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
          >
            {capturing ? '⏳ Capturing…' : '↓ Capture due'}
          </button>
        </div>
      </div>

      {loading && !rows ? (
        <p className="text-gray-400 text-center py-12">Loading…</p>
      ) : error ? (
        <p className="text-red-500 text-center py-12">{error}</p>
      ) : rows && rows.length === 0 ? (
        <div className="border border-gray-100 rounded-xl p-10 text-center">
          <p className="text-gray-400 text-sm">No snapshots yet.</p>
          <p className="text-gray-300 text-xs mt-1">Click &ldquo;Capture due&rdquo; to snapshot videos that are 7+ days old.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-xs min-w-[1200px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-400">
                {COLS.map((c) => (
                  <th key={c.label} className={`px-3 py-2.5 font-medium whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r, i) => (
                <tr key={r.video_id} className={`border-b border-gray-50 last:border-0 ${i % 2 ? 'bg-gray-50/40' : 'bg-white'}`}>
                  {COLS.map((c) => (
                    <td key={c.label} className={`px-3 py-2.5 whitespace-nowrap text-gray-600 ${c.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
