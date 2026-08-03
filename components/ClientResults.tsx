'use client'

import { useMemo, useState } from 'react'
import { AdminClient, ALL_QUESTION_KEYS } from '@/lib/quiz-insights'

// Report pages live in the somatic-quiz app.
const REPORT_BASE = 'https://somatic-quiz.vercel.app/report'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ClientRow({ client }: { client: AdminClient }) {
  const [open, setOpen] = useState(false)
  const quizzesDone = Array.from(new Set(client.submissions.map((s) => s.quiz_number))).sort()

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-rose-50/50 transition-colors text-left"
      >
        <div>
          <p className="font-semibold text-gray-900">{client.name}</p>
          <p className="text-sm text-gray-400">{client.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`text-xs px-1.5 py-0.5 rounded-md ${
                  quizzesDone.includes(n)
                    ? 'bg-rose-100 text-rose-700 font-medium'
                    : 'bg-gray-100 text-gray-300'
                }`}
              >
                Q{n}
              </span>
            ))}
          </div>
          <span className="text-gray-300 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">Quiz</th>
                <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">Date</th>
                {ALL_QUESTION_KEYS.map((key) => {
                  const domainNum = key[0]
                  const isFirstInDomain = key[1] === 'a'
                  return (
                    <th
                      key={key}
                      className="px-1.5 py-2 text-center text-xs font-medium text-rose-700"
                      style={{
                        background: parseInt(domainNum) % 2 === 0 ? '#fff1f2' : '#ffe4e6',
                        borderLeft: isFirstInDomain ? '1px solid #fecdd3' : undefined,
                      }}
                    >
                      {key.toUpperCase()}
                    </th>
                  )
                })}
                <th className="px-4 py-2 text-xs text-gray-400 font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {client.submissions.map((sub) => (
                <tr key={sub.id} className="border-b border-gray-50 hover:bg-rose-50/40">
                  <td className="px-4 py-2 font-semibold text-rose-500">Q{sub.quiz_number}</td>
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                    {formatDate(sub.submitted_at)}
                  </td>
                  {ALL_QUESTION_KEYS.map((key) => {
                    const val = sub.answers[key]
                    const isFirstInDomain = key[1] === 'a'
                    return (
                      <td
                        key={key}
                        className="px-1.5 py-2 text-center text-xs"
                        style={{ borderLeft: isFirstInDomain ? '1px solid #fee2e2' : undefined }}
                      >
                        {val != null ? (
                          <span className="font-medium text-gray-600">{val}</span>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2">
                    <a
                      href={`${REPORT_BASE}/${sub.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rose-500 hover:text-rose-600 text-xs underline whitespace-nowrap"
                    >
                      View →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ClientResults({ clients }: { clients: AdminClient[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    )
  }, [clients, query])

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full max-w-sm bg-white border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400"
        />
      </div>

      {/* Column key */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
          Column guide — each group of 3 questions (A, B, C) forms one area score on the report
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span key={n} className="text-xs text-gray-400">
              <span className="font-medium text-gray-600">{n}A · {n}B · {n}C</span>
            </span>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-20">
          {clients.length === 0 ? 'No submissions yet.' : 'No clients match your search.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
