'use client'

import { useMemo, useState } from 'react'
import {
  AdminClient,
  baselineLandscape,
  transformation,
  summarise,
} from '@/lib/quiz-insights'

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
      <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="shrink-0 text-xs text-rose-500 hover:text-rose-600 border border-gray-200 rounded-lg px-2.5 py-1 transition-colors"
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}

export default function ClientInsights({ clients }: { clients: AdminClient[] }) {
  const landscape = useMemo(() => baselineLandscape(clients), [clients])
  const summary = useMemo(() => summarise(clients, landscape), [clients, landscape])
  const change = useMemo(() => transformation(clients), [clients])

  const followUps =
    (summary.quizCounts[2] ?? 0) + (summary.quizCounts[3] ?? 0) + (summary.quizCounts[4] ?? 0)

  const byStruggle = useMemo(
    () => [...landscape].filter((d) => d.n > 0).sort((a, b) => a.avg - b.avg),
    [landscape]
  )

  const movers = useMemo(
    () => [...change.domains].filter((d) => d.n > 0).sort((a, b) => b.avgChange - a.avgChange),
    [change.domains]
  )

  const improvementLines = useMemo(() => {
    const lines: string[] = []
    if (change.avgOverallGrowth != null) {
      lines.push(
        `On average, clients close ${change.avgOverallGrowth}% of the gap to their goals between their first quiz and their most recent one.`
      )
    }
    movers
      .filter((d) => d.avgChange > 0)
      .forEach((d) => {
        lines.push(
          `Clients' ${d.domainName} rises from ${d.avgBefore} to ${d.avgAfter} out of 10 on average (+${d.avgChange}), with ${d.pctImproved}% improving.`
        )
      })
    return lines
  }, [change.avgOverallGrowth, movers])

  return (
    <div className="space-y-8">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Clients"
          value={String(summary.totalClients)}
          sub={`${summary.clientsWithBaseline} completed the intake quiz`}
        />
        <StatTile
          label="Quizzes taken"
          value={String(summary.totalSubmissions)}
          sub={`${summary.quizCounts[1] ?? 0} intake · ${followUps} follow-up`}
        />
        <StatTile
          label="Avg arrival score"
          value={summary.avgBaselineOverall != null ? `${summary.avgBaselineOverall}/10` : '—'}
          sub="where clients start (all 9 areas)"
        />
        <StatTile
          label="Avg improvement"
          accent
          value={change.avgOverallGrowth != null ? `${change.avgOverallGrowth}%` : '—'}
          sub={
            change.clientsRetaken > 0
              ? `toward goals · ${change.clientsRetaken} clients retaken`
              : 'no retakes yet'
          }
        />
      </div>

      {/* Where women arrive */}
      <section>
        <h3 className="text-base font-semibold text-gray-900">Where women arrive</h3>
        <p className="text-sm text-gray-400 mt-1 mb-4">
          Average intake (Quiz 1) score in each area, lowest first — the pain points your programme
          is built to meet.
        </p>
        {byStruggle.length === 0 ? (
          <p className="text-gray-400 py-8 text-center">No intake data yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {byStruggle.map((d) => {
              const pct = (d.avg / 10) * 100
              return (
                <div key={d.domainId} className="space-y-1.5">
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="text-sm text-gray-600 font-medium">{d.domainName}</span>
                    <div className="flex items-baseline gap-3 shrink-0">
                      <span className="text-xs text-gray-400">{d.pctLow}% arrive low</span>
                      <span className="text-base font-bold text-rose-500">
                        {d.avg}
                        <span className="text-gray-300 font-normal text-xs">/10</span>
                      </span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-rose-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* How clients improve */}
      <section>
        <h3 className="text-base font-semibold text-gray-900">How clients improve</h3>
        <p className="text-sm text-gray-400 mt-1 mb-4">
          Each client&apos;s intake (Quiz 1) compared to their most recent follow-up — counted once
          per client. Based on {change.clientsRetaken} client
          {change.clientsRetaken === 1 ? '' : 's'} who&apos;ve retaken.
        </p>

        {change.clientsRetaken === 0 ? (
          <div className="bg-rose-50 rounded-xl border border-rose-100 p-6">
            <p className="text-sm text-gray-600">
              No follow-up quizzes completed yet. Once clients retake Quiz 2, 3, or 4, their
              before-and-after movement will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              {movers.map((d) => {
                const beforePct = (d.avgBefore / 10) * 100
                const afterPct = (d.avgAfter / 10) * 100
                return (
                  <div key={d.domainId} className="space-y-1.5">
                    <div className="flex justify-between items-baseline gap-3">
                      <span className="text-sm text-gray-600 font-medium">{d.domainName}</span>
                      <div className="flex items-baseline gap-3 shrink-0">
                        <span className="text-xs text-gray-400">
                          {d.avgBefore} → {d.avgAfter} · {d.pctImproved}% improved
                        </span>
                        <span
                          className={`text-base font-bold ${
                            d.avgChange >= 0 ? 'text-emerald-600' : 'text-gray-400'
                          }`}
                        >
                          {d.avgChange >= 0 ? '+' : ''}
                          {d.avgChange}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gray-200 rounded-full"
                        style={{ width: `${beforePct}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full"
                        style={{ width: `${afterPct}%`, opacity: 0.55 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Ready-to-use stats</h4>
              <p className="text-xs text-gray-400 mb-3">
                Anonymised, aggregate figures you can drop straight into content, emails, or sales
                pages.
              </p>
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-2">
                {improvementLines.map((line) => (
                  <CopyLine key={line} text={line} />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
