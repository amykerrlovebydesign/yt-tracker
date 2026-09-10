'use client'

import { useState } from 'react'
import { buildTrackedUrl, goLink } from '@/lib/tracking-links'

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

export default function UtmChecker() {
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
