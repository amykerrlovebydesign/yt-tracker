'use client'

import { useEffect, useRef, useState } from 'react'
import { VIDEO_MAP } from '@/lib/videos'

type VideoStats = {
  video_id: string
  call: number
  webinar: number
  quiz: number
  guide: number
  total: number
  revenue: number
  views: number
  published_at: string | null
}

type MonthlyStats = {
  year: number
  month: number
  videos_published: number
  impressions: number
  views: number
  avg_retention_pct: number | null
  avg_ctr_pct: number | null
  subscriber_gain: number
  total_subscribers: number | null
  watch_time_hours: number
  estimated_revenue: number
  is_partial: boolean
  synced_at: string | null
}

type DisplayMode = 'count' | 'percent'
type SortBy = 'call' | 'webinar' | 'quiz' | 'guide' | 'total' | 'views' | 'video_id' | 'published_at' | null
type SortDir = 'asc' | 'desc'
type DateRange = { from: string | null; to: string | null; label: string }

function pct(count: number, views: number): string {
  if (!views) return '—'
  return ((count / views) * 100).toFixed(1) + '%'
}

function ctr(total: number, views: number): string {
  if (!views) return '—'
  return ((total / views) * 100).toFixed(1) + '%'
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function startOfDay(d: Date): string {
  const c = new Date(d); c.setHours(0, 0, 0, 0); return c.toISOString()
}
function endOfDay(d: Date): string {
  const c = new Date(d); c.setHours(23, 59, 59, 999); return c.toISOString()
}
function rollingRange(days: number, label: string): DateRange {
  const to = new Date(); const from = new Date()
  from.setDate(from.getDate() - days)
  return { from: startOfDay(from), to: endOfDay(to), label }
}
function monthRange(year: number, month: number, label: string): DateRange {
  return {
    from: startOfDay(new Date(year, month - 1, 1)),
    to: endOfDay(new Date(year, month, 0)),
    label,
  }
}
function yearRange(year: number): DateRange {
  return { from: `${year}-01-01T00:00:00.000Z`, to: `${year}-12-31T23:59:59.999Z`, label: String(year) }
}
function getRecentMonths(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('default', { month: 'long' }) }
  })
}

const LIFETIME: DateRange = { from: null, to: null, label: 'Lifetime' }

const SORT_LABELS: Record<NonNullable<SortBy>, string> = {
  call: 'Call', webinar: 'Webinar', quiz: 'Quiz', guide: 'Guide', total: 'Total',
  views: 'Views', video_id: 'Video', published_at: 'Published',
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [stats, setStats] = useState<VideoStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<DisplayMode>('count')
  const [sortBy, setSortBy] = useState<SortBy>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [dateRange, setDateRange] = useState<DateRange>(LIFETIME)
  const [showPicker, setShowPicker] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [editingRevenue, setEditingRevenue] = useState<string | null>(null)
  const [revenueInput, setRevenueInput] = useState('')
  const [editingViews, setEditingViews] = useState<string | null>(null)
  const [viewsInput, setViewsInput] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [ytOpen, setYtOpen] = useState(true)
  const [monthlyOpen, setMonthlyOpen] = useState(true)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [syncingAnalytics, setSyncingAnalytics] = useState(false)
  const [analyticsSyncMsg, setAnalyticsSyncMsg] = useState('')
  const [openYears, setOpenYears] = useState<Set<number>>(new Set([new Date().getFullYear()]))
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Handle OAuth callback redirect params
  useEffect(() => {
    if (!authed) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('yt_connected') === '1') {
      window.history.replaceState({}, '', '/admin')
      syncAnalytics()
    }
    const ytErr = params.get('yt_error')
    if (ytErr) {
      setAnalyticsSyncMsg(`OAuth error: ${ytErr}`)
      window.history.replaceState({}, '', '/admin')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  const login = () => {
    if (password === 'healyourheart2024') {
      setAuthed(true)
      fetchStats(LIFETIME)
      fetchMonthlyStats()
    } else {
      setError('Incorrect password')
    }
  }

  const fetchStats = async (range: DateRange) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (range.from) params.set('from', range.from)
      if (range.to) params.set('to', range.to)
      const res = await fetch(`/api/admin/stats?${params}`)
      const data = await res.json()
      setStats(data.stats || [])
    } catch { setError('Failed to load stats') }
    setLoading(false)
  }

  const fetchMonthlyStats = async () => {
    try {
      const res = await fetch('/api/admin/monthly-stats')
      const data = await res.json()
      setMonthlyStats(data.rows || [])
      setIsConnected(data.isConnected || false)
    } catch { /* silent */ }
  }

  const syncAnalytics = async () => {
    setSyncingAnalytics(true)
    setAnalyticsSyncMsg('')
    try {
      const res = await fetch('/api/admin/sync-youtube-analytics', { method: 'POST' })
      const data = await res.json()
      if (data.error) setAnalyticsSyncMsg('Error: ' + data.error)
      else {
        setAnalyticsSyncMsg(`Synced ${data.synced} months`)
        fetchMonthlyStats()
      }
    } catch { setAnalyticsSyncMsg('Sync failed') }
    setSyncingAnalytics(false)
  }

  const toggleYear = (year: number) => {
    setOpenYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  const applyRange = (range: DateRange) => { setDateRange(range); setShowPicker(false); fetchStats(range) }
  const applyCustom = () => {
    if (!customFrom || !customTo) return
    applyRange({ from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)), label: `${customFrom} → ${customTo}` })
  }

  const saveRevenue = async (videoId: string) => {
    await fetch('/api/admin/revenue', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: videoId, revenue: parseFloat(revenueInput) || 0 }) })
    setEditingRevenue(null); fetchStats(dateRange)
  }
  const saveViews = async (videoId: string) => {
    await fetch('/api/admin/views', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: videoId, views: parseInt(viewsInput) || 0 }) })
    setEditingViews(null); fetchStats(dateRange)
  }

  const toggleSort = (col: NonNullable<SortBy>) => {
    const bidirectional = col === 'video_id' || col === 'published_at'
    if (sortBy !== col) {
      setSortBy(col)
      setSortDir(bidirectional ? 'asc' : 'desc')
    } else if (bidirectional && sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortBy(null)
    }
  }

  const syncYouTube = async () => {
    setSyncing(true); setSyncMsg('')
    try {
      const res = await fetch('/api/admin/sync-youtube', { method: 'POST' })
      const data = await res.json()
      if (data.error) setSyncMsg('Error: ' + data.error)
      else { setSyncMsg(`Synced ${data.synced} videos`); fetchStats(dateRange) }
    } catch { setSyncMsg('Sync failed') }
    setSyncing(false)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-gray-900 text-xl font-semibold mb-1 text-center">Love By Design</h1>
          <p className="text-gray-400 text-sm text-center mb-6">healyourheart.school</p>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-rose-400"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button onClick={login} className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-lg py-3 font-medium transition">
            Sign in
          </button>
        </div>
      </div>
    )
  }

  const recentMonths = getRecentMonths(5)
  const totalClicks  = stats.reduce((a, b) => a + b.total, 0)
  const totalViews   = stats.filter(s => s.video_id !== 'pin').reduce((a, b) => a + b.views, 0)
  const totalCalls   = stats.reduce((a, b) => a + b.call, 0)
  const overallCTR   = totalViews ? ((totalClicks / totalViews) * 100).toFixed(1) + '%' : '—'

  const sortedStats = sortBy
    ? [...stats].sort((a, b) => {
        if (sortBy === 'video_id') {
          const aNum = parseInt(a.video_id) || 0
          const bNum = parseInt(b.video_id) || 0
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum
        }
        if (sortBy === 'published_at') {
          const aT = a.published_at ? new Date(a.published_at).getTime() : 0
          const bT = b.published_at ? new Date(b.published_at).getTime() : 0
          return sortDir === 'asc' ? aT - bT : bT - aT
        }
        return (b[sortBy] || 0) - (a[sortBy] || 0)
      })
    : stats

  const monthlyYears = Array.from(new Set(monthlyStats.map(r => r.year))).sort((a, b) => b - a)

  return (
    <div className="min-h-screen bg-rose-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Love By Design Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">healyourheart.school</p>
        </div>

        {/* ── YouTube Section ── */}
        <div className="mb-6 bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">

          {/* Section header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">YouTube</h2>
          </div>

          {/* Summary cards — always visible */}
          <div className="px-6 pt-5 pb-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Videos Tracked', value: stats.filter(s => s.video_id !== 'pin').length, colour: 'text-gray-900' },
                { label: 'Total Views',    value: totalViews.toLocaleString(),                    colour: 'text-gray-900' },
                { label: 'Total Clicks',   value: totalClicks,                                    colour: 'text-gray-900' },
                { label: 'Overall CTR',    value: overallCTR,                                     colour: 'text-rose-500' },
                { label: 'Total Calls',    value: totalCalls,                                     colour: 'text-blue-600' },
              ].map(card => (
                <div key={card.label} className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.colour}`}>{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Videos sub-section ── */}
          <button
            onClick={() => setYtOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-3 border-t border-gray-100 hover:bg-rose-50/50 transition group"
          >
            <div className="flex items-center gap-2">
              <span className={`text-gray-400 text-[10px] transition-transform duration-200 ${ytOpen ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-sm font-medium text-gray-500">Videos</span>
              <span className="text-xs text-gray-300">{stats.filter(s => s.video_id !== 'pin').length} rows</span>
            </div>
            <span className="text-xs text-gray-300 group-hover:text-rose-400 transition">
              {ytOpen ? 'collapse' : 'expand'}
            </span>
          </button>

          {ytOpen && (
            <div className="px-6 pt-4 pb-6">

              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-3 mb-5">

                {/* Date picker */}
                <div className="relative" ref={pickerRef}>
                  <button
                    onClick={() => setShowPicker(v => !v)}
                    className="flex items-center gap-2 bg-white border border-gray-300 hover:border-rose-400 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition"
                  >
                    <span>📅</span> {dateRange.label} <span className="text-gray-400">{showPicker ? '▲' : '▼'}</span>
                  </button>

                  {showPicker && (
                    <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-72 p-4">
                      <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Rolling</p>
                      <div className="space-y-0.5 mb-4">
                        {[{ days: 7, label: 'Last 7 days' }, { days: 28, label: 'Last 28 days' }, { days: 90, label: 'Last 90 days' }, { days: 365, label: 'Last 365 days' }].map(p => (
                          <button key={p.days} onClick={() => applyRange(rollingRange(p.days, p.label))}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${dateRange.label === p.label ? 'bg-rose-100 text-rose-800 font-medium' : 'text-gray-600 hover:bg-rose-50'}`}>
                            {p.label}
                          </button>
                        ))}
                        <button onClick={() => applyRange(LIFETIME)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${dateRange.label === 'Lifetime' ? 'bg-rose-100 text-rose-800 font-medium' : 'text-gray-600 hover:bg-rose-50'}`}>
                          Lifetime
                        </button>
                      </div>

                      <p className="text-gray-400 text-xs uppercase tracking-widests mb-2">Year</p>
                      <div className="space-y-0.5 mb-4">
                        <button onClick={() => applyRange(yearRange(2026))}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${dateRange.label === '2026' ? 'bg-rose-100 text-rose-800 font-medium' : 'text-gray-600 hover:bg-rose-50'}`}>
                          2026
                        </button>
                      </div>

                      <p className="text-gray-400 text-xs uppercase tracking-widests mb-2">Month</p>
                      <div className="space-y-0.5 mb-4">
                        {recentMonths.map(m => (
                          <button key={`${m.year}-${m.month}`} onClick={() => applyRange(monthRange(m.year, m.month, m.label))}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${dateRange.label === m.label ? 'bg-rose-100 text-rose-800 font-medium' : 'text-gray-600 hover:bg-rose-50'}`}>
                            {m.label}
                          </button>
                        ))}
                      </div>

                      <p className="text-gray-400 text-xs uppercase tracking-widests mb-2">Custom range</p>
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-rose-400" />
                          <span className="text-gray-400 text-xs">→</span>
                          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-rose-400" />
                        </div>
                        <button onClick={applyCustom} disabled={!customFrom || !customTo}
                          className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2 text-sm font-medium transition">
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-7 bg-gray-200" />

                {/* Count / % toggle */}
                <div className="flex bg-white border border-gray-200 rounded-lg p-1 gap-1">
                  <button onClick={() => setMode('count')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${mode === 'count' ? 'bg-rose-500 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                    Counts
                  </button>
                  <button onClick={() => setMode('percent')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${mode === 'percent' ? 'bg-rose-500 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                    % of views
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  {syncMsg && <span className="text-xs text-gray-400">{syncMsg}</span>}
                  <button onClick={syncYouTube} disabled={syncing}
                    className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition">
                    {syncing ? '⏳ Syncing…' : '↑ Sync from YouTube'}
                  </button>
                  <button onClick={() => fetchStats(dateRange)} className="text-sm text-gray-400 hover:text-rose-500 transition">
                    ↻ Refresh
                  </button>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <p className="text-gray-400 text-center py-12">Loading…</p>
              ) : sortedStats.length === 0 ? (
                <div className="border border-gray-200 rounded-xl p-12 text-center">
                  <p className="text-gray-400">No clicks in this period.</p>
                  <p className="text-gray-300 text-sm mt-2">Try a different date range.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide">
                        <th className="text-left px-5 py-3">
                          <button onClick={() => toggleSort('video_id')}
                            className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition hover:opacity-80 ${sortBy === 'video_id' ? 'text-rose-500' : 'text-gray-400'}`}>
                            Video
                            <span className="text-[10px]">{sortBy === 'video_id' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </button>
                        </th>
                        <th className="text-center px-4 py-3">
                          <button onClick={() => toggleSort('published_at')}
                            className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition hover:opacity-80 whitespace-nowrap ${sortBy === 'published_at' ? 'text-rose-500' : 'text-gray-400'}`}>
                            Published
                            <span className="text-[10px]">{sortBy === 'published_at' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </button>
                        </th>
                        <th className="text-center px-4 py-3">
                          <button onClick={() => toggleSort('views')}
                            className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition hover:opacity-80 ${sortBy === 'views' ? 'text-rose-500' : 'text-gray-400'}`}>
                            Views
                            <span className="text-[10px]">{sortBy === 'views' ? '↓' : '↕'}</span>
                          </button>
                        </th>
                        {([
                          { col: 'call',    label: 'Call',    colour: 'text-blue-400',    active: 'text-rose-500' },
                          { col: 'webinar', label: 'Webinar', colour: 'text-violet-400',  active: 'text-rose-500' },
                          { col: 'quiz',    label: 'Quiz',    colour: 'text-emerald-400', active: 'text-rose-500' },
                          { col: 'guide',   label: 'Guide',   colour: 'text-amber-400',   active: 'text-rose-500' },
                          { col: 'total',   label: 'Total',   colour: 'text-gray-400',    active: 'text-rose-500' },
                        ] as { col: NonNullable<SortBy>; label: string; colour: string; active: string }[]).map(({ col, label, colour, active }) => (
                          <th key={col} className="text-center px-4 py-3">
                            <button onClick={() => toggleSort(col)}
                              className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition hover:opacity-80 ${sortBy === col ? active : colour}`}>
                              {label}
                              <span className="text-[10px]">{sortBy === col ? '↓' : '↕'}</span>
                            </button>
                          </th>
                        ))}
                        <th className="text-center px-4 py-3 text-gray-400">CTR</th>
                        <th className="text-center px-4 py-3 text-gray-400">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStats.map((row, i) => {
                        const info = row.video_id !== 'pin' ? VIDEO_MAP[row.video_id] : null
                        return (
                          <tr key={row.video_id}
                            className={`border-b border-gray-100 hover:bg-rose-50/50 transition ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>

                            <td className="px-5 py-3">
                              {row.video_id === 'pin' ? (
                                <span className="text-rose-400 font-medium text-sm">📌 Channel pin</span>
                              ) : (
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-xs text-gray-400 shrink-0">#{row.video_id}</span>
                                  {info?.url ? (
                                    <a href={info.url} target="_blank" rel="noopener noreferrer" title={info?.title}
                                      className="text-gray-800 hover:text-rose-600 text-xs truncate max-w-xs transition">
                                      {info.title} <span className="text-gray-300">↗</span>
                                    </a>
                                  ) : info?.title ? (
                                    <span className="text-gray-500 text-xs truncate max-w-xs">{info.title}</span>
                                  ) : (
                                    <span className="text-gray-300 text-xs italic">Unknown</span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center text-xs text-gray-500 whitespace-nowrap">
                              {row.published_at
                                ? new Date(row.published_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                                : <span className="text-gray-300">—</span>}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {row.video_id === 'pin' ? (
                                <span className="text-gray-300">—</span>
                              ) : editingViews === row.video_id ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <input type="number" value={viewsInput} onChange={e => setViewsInput(e.target.value)}
                                    className="w-24 bg-gray-50 border border-rose-300 text-gray-900 rounded px-2 py-0.5 text-sm focus:outline-none"
                                    autoFocus onKeyDown={e => e.key === 'Enter' && saveViews(row.video_id)} />
                                  <button onClick={() => saveViews(row.video_id)} className="text-emerald-500 text-xs">✓</button>
                                  <button onClick={() => setEditingViews(null)} className="text-gray-400 text-xs">✕</button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingViews(row.video_id); setViewsInput(String(row.views || '')) }}
                                  className="text-gray-700 hover:text-rose-600 font-medium transition">
                                  {row.views ? row.views.toLocaleString() : <span className="text-gray-300 text-xs">+ Add</span>}
                                </button>
                              )}
                            </td>

                            <td className={`px-4 py-3 text-center font-medium ${sortBy === 'call' ? 'text-rose-600 font-bold' : 'text-blue-600'}`}>
                              {mode === 'count' ? (row.call || 0) : pct(row.call, row.views)}
                            </td>
                            <td className={`px-4 py-3 text-center font-medium ${sortBy === 'webinar' ? 'text-rose-600 font-bold' : 'text-violet-600'}`}>
                              {mode === 'count' ? (row.webinar || 0) : pct(row.webinar, row.views)}
                            </td>
                            <td className={`px-4 py-3 text-center font-medium ${sortBy === 'quiz' ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
                              {mode === 'count' ? (row.quiz || 0) : pct(row.quiz, row.views)}
                            </td>
                            <td className={`px-4 py-3 text-center font-medium ${sortBy === 'guide' ? 'text-rose-600 font-bold' : 'text-amber-600'}`}>
                              {mode === 'count' ? (row.guide || 0) : pct(row.guide, row.views)}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-800">
                              {mode === 'count' ? row.total : pct(row.total, row.views)}
                            </td>
                            <td className="px-4 py-3 text-center text-rose-400 font-medium">
                              {ctr(row.total, row.views)}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {editingRevenue === row.video_id ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="text-gray-400">$</span>
                                  <input type="number" value={revenueInput} onChange={e => setRevenueInput(e.target.value)}
                                    className="w-20 bg-gray-50 border border-emerald-400 text-gray-900 rounded px-2 py-0.5 text-sm focus:outline-none"
                                    autoFocus onKeyDown={e => e.key === 'Enter' && saveRevenue(row.video_id)} />
                                  <button onClick={() => saveRevenue(row.video_id)} className="text-emerald-500 text-xs">✓</button>
                                  <button onClick={() => setEditingRevenue(null)} className="text-gray-400 text-xs">✕</button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingRevenue(row.video_id); setRevenueInput(String(row.revenue || '')) }}
                                  className="text-emerald-600 hover:text-emerald-700 font-medium transition">
                                  {row.revenue ? `$${row.revenue.toLocaleString()}` : <span className="text-gray-300 text-xs">+ Add</span>}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Link format reference */}
              <div className="mt-5 border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Tracked link format</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {['call', 'webinar', 'quiz', 'guide'].map(dest => (
                    <div key={dest} className="font-mono text-xs bg-white border border-gray-100 rounded-lg px-3 py-2 text-gray-500">
                      go.healyourheart.school/<span className="text-rose-400">[video#]</span>/{dest}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── Monthly Stats sub-section ── */}
          <button
            onClick={() => setMonthlyOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-3 border-t border-gray-100 hover:bg-rose-50/50 transition group"
          >
            <div className="flex items-center gap-2">
              <span className={`text-gray-400 text-[10px] transition-transform duration-200 ${monthlyOpen ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-sm font-medium text-gray-500">Monthly Stats</span>
              {!isConnected && (
                <span className="text-xs text-amber-400 ml-1">· not connected</span>
              )}
            </div>
            <span className="text-xs text-gray-300 group-hover:text-rose-400 transition">
              {monthlyOpen ? 'collapse' : 'expand'}
            </span>
          </button>

          {monthlyOpen && (
            <div className="px-6 pt-4 pb-6 border-t border-gray-100">

              {/* Connection + sync controls */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {!isConnected ? (
                  <a
                    href="/api/admin/youtube-auth/start"
                    className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
                  >
                    Connect YouTube Analytics
                  </a>
                ) : (
                  <>
                    <span className="text-xs text-emerald-500 font-medium">✓ YouTube Analytics connected</span>
                    <a
                      href="/api/admin/youtube-auth/start"
                      className="text-xs text-gray-400 hover:text-rose-500 transition underline"
                    >
                      Reconnect
                    </a>
                  </>
                )}

                <div className="ml-auto flex items-center gap-3">
                  {analyticsSyncMsg && (
                    <span className="text-xs text-gray-400">{analyticsSyncMsg}</span>
                  )}
                  {isConnected && (
                    <button
                      onClick={syncAnalytics}
                      disabled={syncingAnalytics}
                      className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
                    >
                      {syncingAnalytics ? '⏳ Syncing…' : '↑ Sync Monthly Stats'}
                    </button>
                  )}
                </div>
              </div>

              {/* Data */}
              {monthlyStats.length === 0 ? (
                <div className="border border-gray-100 rounded-xl p-10 text-center">
                  <p className="text-gray-400 text-sm">
                    {isConnected
                      ? 'No data yet — click "Sync Monthly Stats" to fetch from Jan 2025.'
                      : 'Connect YouTube Analytics above to pull monthly channel stats.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {monthlyYears.map(year => (
                    <div key={year} className="border border-gray-100 rounded-xl overflow-hidden">

                      {/* Year header */}
                      <button
                        onClick={() => toggleYear(year)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 hover:bg-rose-50/50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-gray-400 text-[10px] transition-transform duration-200 ${openYears.has(year) ? 'rotate-90' : ''}`}>▶</span>
                          <span className="font-semibold text-gray-700 text-sm">{year}</span>
                          <span className="text-xs text-gray-400">
                            {monthlyStats.filter(r => r.year === year).length} months
                          </span>
                        </div>
                        <span className="text-xs text-gray-300">
                          {openYears.has(year) ? 'collapse' : 'expand'}
                        </span>
                      </button>

                      {openYears.has(year) && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs min-w-[920px]">
                            <thead>
                              <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide text-[10px] bg-white">
                                <th className="text-left px-4 py-2 w-36">Month</th>
                                <th className="text-center px-3 py-2">Videos</th>
                                <th className="text-right px-3 py-2">Impressions</th>
                                <th className="text-right px-3 py-2">Views</th>
                                <th className="text-right px-3 py-2">Retention</th>
                                <th className="text-right px-3 py-2">Imp CTR</th>
                                <th className="text-right px-3 py-2">Subs Gained</th>
                                <th className="text-right px-3 py-2">Total Subs</th>
                                <th className="text-right px-3 py-2">Watch Hrs</th>
                                <th className="text-right px-4 py-2">Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthlyStats
                                .filter(r => r.year === year)
                                .map((row, i) => {
                                  const monthName = new Date(row.year, row.month - 1, 1)
                                    .toLocaleString('default', { month: 'long' })
                                  return (
                                    <tr
                                      key={`${row.year}-${row.month}`}
                                      className={`border-b border-gray-50 last:border-0 ${row.is_partial ? 'bg-blue-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                                    >
                                      <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap">
                                        {monthName}
                                        {row.is_partial && (
                                          <span className="ml-2 text-[9px] font-semibold text-blue-500 bg-blue-50 border border-blue-100 rounded-full px-1.5 py-0.5">
                                            LIVE
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 text-center text-gray-600">
                                        {row.videos_published || '—'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-gray-600">
                                        {row.impressions ? fmtNum(row.impressions) : '—'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-gray-600">
                                        {row.views ? fmtNum(row.views) : '—'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-gray-600">
                                        {row.avg_retention_pct != null ? row.avg_retention_pct.toFixed(1) + '%' : '—'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-gray-600">
                                        {row.avg_ctr_pct != null ? row.avg_ctr_pct.toFixed(2) + '%' : '—'}
                                      </td>
                                      <td className={`px-3 py-2.5 text-right font-medium ${row.subscriber_gain > 0 ? 'text-emerald-600' : row.subscriber_gain < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {row.subscriber_gain !== 0
                                          ? (row.subscriber_gain > 0 ? '+' : '') + row.subscriber_gain.toLocaleString()
                                          : '—'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-gray-600">
                                        {row.total_subscribers != null ? fmtNum(row.total_subscribers) : '—'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-gray-600">
                                        {row.watch_time_hours ? fmtNum(Math.round(row.watch_time_hours)) + 'h' : '—'}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-gray-600">
                                        {row.estimated_revenue > 0 ? `$${row.estimated_revenue.toFixed(2)}` : '—'}
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
        {/* Future sections go here */}

      </div>
    </div>
  )
}
