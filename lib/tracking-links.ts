import { DESTINATIONS } from './destinations'

// The public short-link domain used in YouTube descriptions.
export const GO_BASE = 'https://go.healyourheart.school'

/**
 * utm_medium = the FUNNEL a lead goes through to book a call (per Amy's
 * S.O.P. Sales Tracker model), NOT the channel type. Each destination is a
 * different funnel. These strings must match the Medium reference table in the
 * Sales Tracker exactly.
 *
 *   call    → application  (clicks the application/booking link) — IN USE NOW
 *   webinar → webinar      (confirm string when you start tracking webinars)
 *   guide   → leadmagnet   (confirm string when you start tracking the guide)
 *   quiz    → quiz         (confirm string when you start tracking the quiz)
 */
const MEDIUM_BY_DESTINATION: Record<string, string> = {
  call: 'application',
  webinar: 'webinar',
  guide: 'leadmagnet',
  quiz: 'quiz',
}

/**
 * Attach UTM labels to a destination URL. Read it like a sentence:
 * "came from <source>, through the <medium> funnel, because of <campaign>."
 * source defaults to youtube (most tracked links live on YouTube).
 */
export function buildUtmUrl(
  destination: string,
  medium: string,
  campaign: string,
  source: string = 'youtube'
): string | null {
  const base = DESTINATIONS[destination.toLowerCase()]
  if (!base) return null
  const url = new URL(base)
  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', campaign)
  return url.toString()
}

/**
 * The single source of truth for what a per-video YouTube tracking link
 * redirects to. medium = the destination's funnel; campaign = the exact video.
 *
 *   utm_source=youtube  utm_medium=<funnel>  utm_campaign=yt_<number>
 */
export function buildTrackedUrl(videoId: string, destination: string): string | null {
  const dest = destination.toLowerCase()
  return buildUtmUrl(dest, MEDIUM_BY_DESTINATION[dest] || dest, `yt_${videoId}`)
}

/** The short link that goes in the video description. */
export function goLink(videoId: string, destination: string): string {
  return `${GO_BASE}/${videoId}/${destination.toLowerCase()}`
}

// ---- Newsletter links -------------------------------------------------------
// Newsletters send people to book a call (or occasionally a webinar). They live
// under /nl/<destination>/<date> so they never collide with the video links
// (/<video#>/<dest>), and they carry source=newsletter (not youtube). The date
// at the end is the campaign — you only change that each time.
//
//   go.healyourheart.school/nl/call/16-9-26
//     → .../call?utm_source=newsletter&utm_medium=application&utm_campaign=16-9-26
//
//   go.healyourheart.school/nl/webinar/16-9-26   (if that email uses a webinar)
//     → .../webinar?utm_source=newsletter&utm_medium=webinar&utm_campaign=16-9-26

/**
 * Normalise a hand-typed date code to Amy's canonical form: day-first, dashes,
 * NO leading zeros, 2-digit year. Typo-tolerant — accepts leading zeros and
 * 4-digit years. An optional trailing -<letter/number> is kept, so a 2nd
 * call email on the same day can be tagged separately. Returns '' if it isn't
 * a plausible d-m-y date.
 *   "16-09-26" → "16-9-26"   "06-9-2026" → "6-9-26"   "16-9-26-b" → "16-9-26-b"
 */
export function normalizeDateCode(input: string): string {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})(?:-([a-z0-9]+))?$/i.exec((input || '').trim())
  if (!m) return ''
  const day = Number(m[1])
  const month = Number(m[2])
  const yy = m[3].slice(-2)
  if (day < 1 || day > 31 || month < 1 || month > 12) return ''
  const suffix = m[4] ? `-${m[4].toLowerCase()}` : ''
  return `${day}-${month}-${yy}${suffix}`
}

/** Convert an <input type="date"> value (yyyy-mm-dd) to the day-first code. */
export function toDateCode(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((isoDate || '').trim())
  if (!m) return ''
  return normalizeDateCode(`${Number(m[3])}-${Number(m[2])}-${m[1].slice(2)}`)
}

/** Where a newsletter go-link redirects to, with UTM labels attached. */
export function buildNewsletterUrl(dateInput: string, destination: string = 'call'): string | null {
  const code = normalizeDateCode(dateInput)
  if (!code) return null
  const dest = destination.toLowerCase()
  return buildUtmUrl(dest, MEDIUM_BY_DESTINATION[dest] || dest, code, 'newsletter')
}

/** The short link that goes in the newsletter email. */
export function newsletterGoLink(dateInput: string, destination: string = 'call'): string {
  const code = normalizeDateCode(dateInput) || dateInput
  return `${GO_BASE}/nl/${destination.toLowerCase()}/${code}`
}
