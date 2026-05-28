'use client'

import { useEffect, useState } from 'react'
import { DESTINATION_LABELS } from '@/lib/destinations'

type ClickRow = {
  video_id: string
  destination: string
  clicked_at: string
}

type VideoStats = {
  video_id: string
  call: number
  webinar: number
  quiz: number
  guide: number
  total: number
  revenue: number
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [stats, setStats] = useState<VideoStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingRevenue, setEditingRevenue] = useState<string | null>(null)
  const [revenueInput, setRevenueInput] = useState('')

  const login = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === 'healyourheart2024') {
      setAuthed(true)
      fetchStats()
    } else {
      setError('Incorrect password')
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      setStats(data.stats || [])
    } catch {
      setError('Failed to load stats')
    }
    setLoading(false)
  }

  const saveRevenue = async (videoId: string) => {
    await fetch('/api/admin/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: videoId, revenue: parseFloat(revenueInput) || 0 }),
    })
    setEditingRevenue(null)
    fetchStats()
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-white text-xl font-semibold mb-6 text-center">YouTube Tracker</h1>
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

  const totalClicks = stats.reduce((a, b) => a + b.total, 0)
  const totalRevenue = stats.reduce((a, b) => a + b.revenue, 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">YouTube Link Tracker</h1>
            <p className="text-gray-500 text-sm mt-1">healyourheart.school</p>
          </div>
          <button onClick={fetchStats} className="text-sm text-gray-400 hover:text-white transition">
            ↻ Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Videos Tracked</p>
            <p className="text-3xl font-bold">{stats.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Clicks</p>
            <p className="text-3xl font-bold">{totalClicks}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Calls</p>
            <p className="text-3xl font-bold text-blue-400">{stats.reduce((a, b) => a + b.call, 0)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-green-400">${totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading...</p>
        ) : stats.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-500">No clicks tracked yet.</p>
            <p className="text-gray-600 text-sm mt-2">Add your tracked links to YouTube descriptions to start seeing data here.</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Video #</th>
                  <th className="text-center px-4 py-3">Call</th>
                  <th className="text-center px-4 py-3">Webinar</th>
                  <th className="text-center px-4 py-3">Quiz</th>
                  <th className="text-center px-4 py-3">Guide</th>
                  <th className="text-center px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row, i) => (
                  <tr key={row.video_id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${i % 2 === 0 ? '' : 'bg-gray-900/50'}`}>
                    <td className="px-5 py-3 font-mono font-semibold text-white">{row.video_id}</td>
                    <td className="px-4 py-3 text-center text-blue-400 font-medium">{row.call || 0}</td>
                    <td className="px-4 py-3 text-center text-purple-400 font-medium">{row.webinar || 0}</td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-medium">{row.quiz || 0}</td>
                    <td className="px-4 py-3 text-center text-amber-400 font-medium">{row.guide || 0}</td>
                    <td className="px-4 py-3 text-center font-bold">{row.total}</td>
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
                          {row.revenue ? `$${row.revenue.toLocaleString()}` : '+ Add'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Link reference */}
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Your tracked link format</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {['call','webinar','quiz','guide'].map(dest => (
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
