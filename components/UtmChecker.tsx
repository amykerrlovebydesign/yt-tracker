'use client'

import { useState } from 'react'
import {
  buildTrackedUrl,
  goLink,
  buildNewsletterUrl,
  newsletterGoLink,
  toDateCode,
} from '@/lib/tracking-links'

const DESTS = [
  { id: 'call', label: 'Book a call' },
  { id: 'webinar', label: 'Webinar' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'guide', label: 'Guide' },
]

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="shrink-0 text-xs text-rose-500 hover:text-rose-600 border border-gray-200 rounded px-2 py-0.5 transition-colors"
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  )
}

function VideoChecker() {
  const [num, setNum] = useState('151')
  const v = num.trim()

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl leading-relaxed">
        Type a video number to see the exact link that goes in the description (left) and where it
        sends people, with the tracking labels attached (right). The labels tell Calendly and Kartra
        which video a lead came from, so it can flow onto your sales sheet when they book.
      </p>

      <div className="flex items-center gap-2 mb-5">
        <label className="text-sm text-gray-600">Video #</label>
        <input
          value={num}
          onChange={(e) => setNum(e.target.value)}
          placeholder="151"
          className="w-24 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-rose-400"
        />
      </div>

      {v ? (
        <div className="border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium">Button</th>
                <th className="text-left px-4 py-2.5 font-medium">Link for the video description</th>
                <th className="text-left px-4 py-2.5 font-medium">Where it lands (with labels)</th>
              </tr>
            </thead>
            <tbody>
              {DESTS.map((d) => {
                const gl = goLink(v, d.id)
                const target = buildTrackedUrl(v, d.id) || ''
                return (
                  <tr key={d.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{d.label}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-gray-600 break-all">{gl}</code>
                        <CopyBtn text={gl} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={target}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-500 hover:text-rose-600 break-all"
                      >
                        {target}
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Enter a video number above.</p>
      )}

      <p className="text-xs text-gray-400 mt-4 max-w-2xl leading-relaxed">
        Quickest live check: click a &ldquo;where it lands&rdquo; link and look at your browser&apos;s
        address bar — you should see <code className="text-gray-500">utm_campaign=yt_{v || '151'}</code> on
        video {v || '151'}&apos;s links.
      </p>
    </div>
  )
}

function todayIso() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function NewsletterChecker() {
  const [iso, setIso] = useState(todayIso())
  const [dest, setDest] = useState('call')
  const [suffix, setSuffix] = useState('')

  // Build the date code, appending an optional same-day suffix (b, c, …).
  const baseCode = toDateCode(iso)
  const code = baseCode && suffix.trim() ? `${baseCode}-${suffix.trim().toLowerCase()}` : baseCode

  const gl = code ? newsletterGoLink(code, dest) : ''
  const target = code ? buildNewsletterUrl(code, dest) || '' : ''

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl leading-relaxed">
        Pick the date the email goes out. Copy the link on the left into your newsletter. When someone
        clicks it and books, <code className="text-gray-500">newsletter</code> and the email&apos;s date
        flow through to your sales sheet — so you can see which email brought the call.
      </p>

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email send date</label>
          <input
            type="date"
            value={iso}
            onChange={(e) => setIso(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-rose-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Goes to</label>
          <select
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-rose-400"
          >
            <option value="call">Book a call</option>
            <option value="webinar">Webinar</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">2nd email today? (optional)</label>
          <input
            value={suffix}
            onChange={(e) => setSuffix(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
            placeholder="b"
            className="w-20 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-rose-400"
          />
        </div>
      </div>

      {code ? (
        <div className="border border-gray-200 rounded-xl p-4 space-y-4 max-w-2xl">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
              Link for the newsletter
            </div>
            <div className="flex items-center gap-2">
              <code className="text-sm text-gray-800 break-all">{gl}</code>
              <CopyBtn text={gl} />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
              Where it lands (with labels)
            </div>
            <a
              href={target}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-rose-500 hover:text-rose-600 break-all"
            >
              {target}
            </a>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 pt-1 border-t border-gray-100">
            <span>source: <span className="text-gray-800">newsletter</span></span>
            <span>medium: <span className="text-gray-800">{dest === 'call' ? 'application' : dest}</span></span>
            <span>campaign: <span className="text-gray-800">{code}</span></span>
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Pick a valid date above.</p>
      )}

      {dest === 'webinar' && (
        <p className="text-xs text-amber-600 mt-4 max-w-2xl leading-relaxed">
          Heads up: <code>medium=webinar</code> is a default — before you rely on it, check
          &ldquo;webinar&rdquo; matches the Medium list in your Sales Tracker.
        </p>
      )}
    </div>
  )
}

export default function UtmChecker() {
  const [mode, setMode] = useState<'video' | 'newsletter'>('video')

  return (
    <div>
      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 mb-6">
        {(['video', 'newsletter'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              mode === m ? 'bg-rose-500 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {m === 'video' ? 'YouTube video' : 'Newsletter'}
          </button>
        ))}
      </div>

      {mode === 'video' ? <VideoChecker /> : <NewsletterChecker />}
    </div>
  )
}
