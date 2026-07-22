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
}

type DisplayMode = 'count' | 'percent'
type SortBy = 'call' | 'webinar' | 'quiz' | 'guide' | null
type DateRange = { from: string | null; to: string | null; label: string }

function pct(count: number, views: number): string {
  if (!views) return '—'
  return ((count / views) * 100).toFixed(1) + '%'
}

function ctr(total: number, views: number): string {
  if (!views) return '—'
  return ((total / views) * 100).toFixed(1) + '%'
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
  call: 'Call', webinar: 'Webinar', quiz: 'Quiz', guide: 'Guide',
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [stats, setStats] = useState<VideoStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<DisplayMode>('count')
  const [sortBy, setSortBy] = useState<SortBy>(null)
  const [dateRange, setDateRange] = useState<DateRange>(LIFETIME)
  const [showPicker, setShowPicker] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [editingRevenue, setEditingRevenue] = useState<string | null>(null)
  const [revenueInput, setRevenueInput] = useState('')
  const [editingViews, setEditingViews] = useState<string | null>(null)
  const [viewsInput, setViewsInput] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const login = () => {
    if (password === 'healyourheart2024') { setAuthed(true); fetchStats(LIFETIME) }
    else setError('Incorrect password')
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

  const toggleSort = (col: NonNullable<SortBy>) => setSortBy(prev => prev === col ? null : col)

  if (!authed) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-gray-900 text-xl font-semibold mb-1 text-center">YouTube Dashboard</h1>
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
  const totalRevenue = stats.reduce((a, b) => a + b.revenue, 0)
  const totalCalls   = stats.reduce((a, b) => a + b.call, 0)
  const overallCTR   = totalViews ? ((totalClicks / totalViews) * 100).toFixed(1) + '%' : '—'

  const sortedStats = sortBy
    ? [...stats].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
    : stats

  return (
    <div className="min-h-screen bg-rose-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YouTube Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">healyourheart.school</p>
          </div>
          <button onClick={() => fetchStats(dateRange)} className="text-sm text-gray-400 hover:text-rose-500 transition">
            ↻ Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Videos Tracked', value: stats.filter(s => s.video_id !== 'pin').length, colour: 'text-gray-900' },
            { label: 'Total Views', value: totalViews.toLocaleString(), colour: 'text-gray-900' },
            { label: 'Total Clicks', value: totalClicks, colour: 'text-gray-900' },
            { label: 'Overall CTR', value: overallCTR, colour: 'text-rose-500' },
            { label: 'Total Calls', value: totalCalls, colour: 'text-blue-600' },
          ].map(card => (
            <div key={card.label} className="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{card.label}</p>
              <p className={`text-3xl font-bold ${card.colour}`}>{card.value}</p>
            </div>
          ))}
        </div>

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

                <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Year</p>
                <div className="space-y-0.5 mb-4">
                  <button onClick={() => applyRange(yearRange(2026))}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${dateRange.label === '2026' ? 'bg-rose-100 text-rose-800 font-medium' : 'text-gray-600 hover:bg-rose-50'}`}>
                    2026
                  </button>
                </div>

                <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Month</p>
                <div className="space-y-0.5 mb-4">
                  {recentMonths.map(m => (
                    <button key={`${m.year}-${m.month}`} onClick={() => applyRange(monthRange(m.year, m.month, m.label))}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${dateRange.label === m.label ? 'bg-rose-100 text-rose-800 font-medium' : 'text-gray-600 hover:bg-rose-50'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>

                <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Custom range</p>
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

          {/* Divider */}
          <div className="w-px h-7 bg-gray-200" />

          {/* Sort buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-xs mr-1">Sort by highest:</span>
            {(['call', 'webinar', 'quiz', 'guide'] as NonNullable<SortBy>[]).map(col => (
              <button key={col} onClick={() => toggleSort(col)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  sortBy === col
                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:text-rose-600'
                }`}>
                {SORT_LABELS[col]}
              </button>
            ))}
            {sortBy && (
              <button onClick={() => setSortBy(null)} className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition">
                ✕ Clear
              </button>
            )}
          </div>

          {/* Divider */}
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
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-400 text-center py-12">Loading...</p>
        ) : sortedStats.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400">No clicks in this period.</p>
            <p className="text-gray-300 text-sm mt-2">Try a different date range.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Video</th>
                  <th className="text-center px-4 py-3">Views</th>
                  <th className={`text-center px-4 py-3 ${sortBy === 'call' ? 'text-rose-500' : 'text-blue-400'}`}>Call</th>
                  <th className={`text-center px-4 py-3 ${sortBy === 'webinar' ? 'text-rose-500' : 'text-violet-400'}`}>Webinar</th>
                  <th className={`text-center px-4 py-3 ${sortBy === 'quiz' ? 'text-rose-500' : 'text-emerald-400'}`}>Quiz</th>
                  <th className={`text-center px-4 py-3 ${sortBy === 'guide' ? 'text-rose-500' : 'text-amber-400'}`}>Guide</th>
                  <th className="text-center px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">CTR</th>
                  <th className="text-center px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((row, i) => {
                  const info = row.video_id !== 'pin' ? VIDEO_MAP[row.video_id] : null
                  return (
                    <tr key={row.video_id}
                      className={`border-b border-gray-100 hover:bg-rose-50/50 transition ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>

                      {/* Video */}
                      <td className="px-5 py-3">
                        {row.video_id === 'pin' ? (
                          <span className="text-rose-400 font-medium text-sm">📌 Channel pin</span>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs text-gray-400 shrink-0">#{row.video_id}</span>
                            {info?.url ? (
                              <a href={info.url} target="_blank" rel="noopener noreferrer"
                                title={info?.title}
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

                      {/* Views */}
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

                      {/* Call */}
                      <td className={`px-4 py-3 text-center font-medium ${sortBy === 'call' ? 'text-rose-600 font-bold' : 'text-blue-600'}`}>
                        {mode === 'count' ? (row.call || 0) : pct(row.call, row.views)}
                      </td>

                      {/* Webinar */}
                      <td className={`px-4 py-3 text-center font-medium ${sortBy === 'webinar' ? 'text-rose-600 font-bold' : 'text-violet-600'}`}>
                        {mode === 'count' ? (row.webinar || 0) : pct(row.webinar, row.views)}
                      </td>

                      {/* Quiz */}
                      <td className={`px-4 py-3 text-center font-medium ${sortBy === 'quiz' ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
                        {mode === 'count' ? (row.quiz || 0) : pct(row.quiz, row.views)}
                      </td>

                      {/* Guide */}
                      <td className={`px-4 py-3 text-center font-medium ${sortBy === 'guide' ? 'text-rose-600 font-bold' : 'text-amber-600'}`}>
                        {mode === 'count' ? (row.guide || 0) : pct(row.guide, row.views)}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-center font-bold text-gray-800">
                        {mode === 'count' ? row.total : pct(row.total, row.views)}
                      </td>

                      {/* CTR */}
                      <td className="px-4 py-3 text-center text-rose-400 font-medium">
                        {ctr(row.total, row.views)}
                      </td>

                      {/* Revenue */}
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
        <div className="mt-8 bg-white border border-gray-200 shadow-sm rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Tracked link format</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {['call', 'webinar', 'quiz', 'guide'].map(dest => (
              <div key={dest} className="font-mono text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-500">
                go.healyourheart.school/<span className="text-rose-400">[video#]</span>/{dest}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
