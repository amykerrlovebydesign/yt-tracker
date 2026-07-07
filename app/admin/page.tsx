'use client'

import { useEffect, useRef, useState } from 'react'

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
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c.toISOString()
}

function endOfDay(d: Date): string {
  const c = new Date(d)
  c.setHours(23, 59, 59, 999)
  return c.toISOString()
}

function rollingRange(days: number, label: string): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return { from: startOfDay(from), to: endOfDay(to), label }
}

function monthRange(year: number, month: number, label: string): DateRange {
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)
  return { from: startOfDay(from), to: endOfDay(to), label }
}

function yearRange(year: number): DateRange {
  return {
    from: `${year}-01-01T00:00:00.000Z`,
    to: `${year}-12-31T23:59:59.999Z`,
    label: String(year),
  }
}

function getRecentMonths(count: number) {
  const months = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString('default', { month: 'long' }),
    })
  }
  return months
}

const LIFETIME: DateRange = { from: null, to: null, label: 'Lifetime' }

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [stats, setStats] = useState<VideoStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<DisplayMode>('count')
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
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const login = () => {
    if (password === 'healyourheart2024') {
      setAuthed(true)
      fetchStats(LIFETIME)
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
    } catch {
      setError('Failed to load stats')
    }
    setLoading(false)
  }

  const applyRange = (range: DateRange) => {
    setDateRange(range)
    setShowPicker(false)
    fetchStats(range)
  }

  const applyCustom = () => {
    if (!customFrom || !customTo) return
    const range: DateRange = {
      from: startOfDay(new Date(customFrom)),
      to: endOfDay(new Date(customTo)),
      label: `${customFrom} → ${customTo}`,
    }
    applyRange(range)
  }

  const saveRevenue = async (videoId: string) => {
    await fetch('/api/admin/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: videoId, revenue: parseFloat(revenueInput) || 0 }),
    })
    setEditingRevenue(null)
    fetchStats(dateRange)
  }

  const saveViews = async (videoId: string) => {
    await fetch('/api/admin/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: videoId, views: parseInt(viewsInput) || 0 }),
    })
    setEditingViews(null)
    fetchStats(dateRange)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-white text-xl font-semibold mb-6 text-center">YouTube Dashboard</h1>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-green-500"
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            onClick={login}
            className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg py-3 font-medium transition"
          >
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

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">YouTube Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">healyourheart.school</p>
          </div>
          <button
            onClick={() => fetchStats(dateRange)}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Date range picker */}
        <div className="relative mb-8" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition"
          >
            <span className="text-gray-400">📅</span>
            {dateRange.label}
            <span className="text-gray-500 ml-1">{showPicker ? '▲' : '▼'}</span>
          </button>

          {showPicker && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-72 p-4">

              {/* Rolling */}
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Rolling</p>
              <div className="space-y-0.5 mb-4">
                {[
                  { days: 7,   label: 'Last 7 days' },
                  { days: 28,  label: 'Last 28 days' },
                  { days: 90,  label: 'Last 90 days' },
                  { days: 365, label: 'Last 365 days' },
                ].map(p => (
                  <button
                    key={p.days}
                    onClick={() => applyRange(rollingRange(p.days, p.label))}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      dateRange.label === p.label
                        ? 'bg-white text-gray-900 font-medium'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => applyRange(LIFETIME)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    dateRange.label === 'Lifetime'
                      ? 'bg-white text-gray-900 font-medium'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Lifetime
                </button>
              </div>

              {/* Year */}
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Year</p>
              <div className="space-y-0.5 mb-4">
                {[2026].map(y => (
                  <button
                    key={y}
                    onClick={() => applyRange(yearRange(y))}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      dateRange.label === String(y)
                        ? 'bg-white text-gray-900 font-medium'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              {/* Month */}
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Month</p>
              <div className="space-y-0.5 mb-4">
                {recentMonths.map(m => (
                  <button
                    key={`${m.year}-${m.month}`}
                    onClick={() => applyRange(monthRange(m.year, m.month, m.label))}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      dateRange.label === m.label
                        ? 'bg-white text-gray-900 font-medium'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Custom */}
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Custom range</p>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-green-500"
                  />
                  <span className="text-gray-600 text-xs">→</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-green-500"
                  />
                </div>
                <button
                  onClick={applyCustom}
                  disabled={!customFrom || !customTo}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2 text-sm font-medium transition"
                >
                  Apply
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Videos Tracked</p>
            <p className="text-3xl font-bold">{stats.filter(s => s.video_id !== 'pin').length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Views</p>
            <p className="text-3xl font-bold">{totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Clicks</p>
            <p className="text-3xl font-bold">{totalClicks}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Overall CTR</p>
            <p className="text-3xl font-bold text-purple-400">{overallCTR}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Calls</p>
            <p className="text-3xl font-bold text-blue-400">{totalCalls}</p>
          </div>
        </div>

        {/* Count / % Toggle */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-gray-400 text-sm">Show:</span>
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => setMode('count')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                mode === 'count' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              Click counts
            </button>
            <button
              onClick={() => setMode('percent')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                mode === 'percent' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              % of views
            </button>
          </div>
          {mode === 'percent' && (
            <span className="text-gray-600 text-xs ml-2">Enter view counts per video to unlock percentages</span>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading...</p>
        ) : stats.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-500">No clicks in this period.</p>
            <p className="text-gray-600 text-sm mt-2">Try a different date range.</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Video</th>
                  <th className="text-center px-4 py-3">Views</th>
                  <th className="text-center px-4 py-3 text-blue-400">Call</th>
                  <th className="text-center px-4 py-3 text-purple-400">Webinar</th>
                  <th className="text-center px-4 py-3 text-emerald-400">Quiz</th>
                  <th className="text-center px-4 py-3 text-amber-400">Guide</th>
                  <th className="text-center px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">CTR</th>
                  <th className="text-center px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row, i) => (
                  <tr
                    key={row.video_id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${i % 2 === 0 ? '' : 'bg-gray-900/50'}`}
                  >
                    {/* Video */}
                    <td className="px-5 py-3 font-mono font-semibold text-white">
                      {row.video_id === 'pin' ? (
                        <span className="text-yellow-400">📌 Channel pin</span>
                      ) : (
                        `#${row.video_id}`
                      )}
                    </td>

                    {/* Views — editable */}
                    <td className="px-4 py-3 text-center">
                      {row.video_id === 'pin' ? (
                        <span className="text-gray-600">—</span>
                      ) : editingViews === row.video_id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            value={viewsInput}
                            onChange={e => setViewsInput(e.target.value)}
                            className="w-24 bg-gray-800 border border-purple-600 text-white rounded px-2 py-0.5 text-sm focus:outline-none"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && saveViews(row.video_id)}
                          />
                          <button onClick={() => saveViews(row.video_id)} className="text-green-400 hover:text-green-300 text-xs">✓</button>
                          <button onClick={() => setEditingViews(null)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingViews(row.video_id); setViewsInput(String(row.views || '')) }}
                          className="text-gray-300 hover:text-white font-medium"
                        >
                          {row.views ? row.views.toLocaleString() : <span className="text-gray-600">+ Add</span>}
                        </button>
                      )}
                    </td>

                    {/* Call */}
                    <td className="px-4 py-3 text-center text-blue-400 font-medium">
                      {mode === 'count' ? (row.call || 0) : pct(row.call, row.views)}
                    </td>

                    {/* Webinar */}
                    <td className="px-4 py-3 text-center text-purple-400 font-medium">
                      {mode === 'count' ? (row.webinar || 0) : pct(row.webinar, row.views)}
                    </td>

                    {/* Quiz */}
                    <td className="px-4 py-3 text-center text-emerald-400 font-medium">
                      {mode === 'count' ? (row.quiz || 0) : pct(row.quiz, row.views)}
                    </td>

                    {/* Guide */}
                    <td className="px-4 py-3 text-center text-amber-400 font-medium">
                      {mode === 'count' ? (row.guide || 0) : pct(row.guide, row.views)}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-center font-bold">
                      {mode === 'count' ? row.total : pct(row.total, row.views)}
                    </td>

                    {/* CTR */}
                    <td className="px-4 py-3 text-center text-gray-400 font-medium">
                      {ctr(row.total, row.views)}
                    </td>

                    {/* Revenue — editable */}
                    <td className="px-4 py-3 text-center">
                      {editingRevenue === row.video_id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <span className="text-gray-400">$</span>
                          <input
                            type="number"
                            value={revenueInput}
                            onChange={e => setRevenueInput(e.target.value)}
                            className="w-20 bg-gray-800 border border-green-600 text-white rounded px-2 py-0.5 text-sm focus:outline-none"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && saveRevenue(row.video_id)}
                          />
                          <button onClick={() => saveRevenue(row.video_id)} className="text-green-400 hover:text-green-300 text-xs">✓</button>
                          <button onClick={() => setEditingRevenue(null)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingRevenue(row.video_id); setRevenueInput(String(row.revenue || '')) }}
                          className="text-green-400 hover:text-green-300 font-medium"
                        >
                          {row.revenue ? `$${row.revenue.toLocaleString()}` : <span className="text-gray-600">+ Add</span>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Link format reference */}
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Tracked link format</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {['call', 'webinar', 'quiz', 'guide'].map(dest => (
              <div key={dest} className="font-mono text-xs bg-gray-800 rounded-lg px-3 py-2 text-gray-300">
                go.healyourheart.school/<span className="text-yellow-400">[video#]</span>/{dest}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
