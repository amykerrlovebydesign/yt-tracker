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
 * Attach UTM labels to a destination URL. utm_source is always youtube (every
 * tracked link lives on YouTube). Read it like a sentence:
 * "came from youtube, through the <medium> funnel, because of <campaign>."
 */
export function buildUtmUrl(destination: string, medium: string, campaign: string): string | null {
  const base = DESTINATIONS[destination.toLowerCase()]
  if (!base) return null
  const url = new URL(base)
  url.searchParams.set('utm_source', 'youtube')
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
