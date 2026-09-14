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
 * The single source of truth for what a YouTube tracking link redirects to.
 * Appends UTM labels so the Sales Tracker can attribute a booked call back to
 * the exact video + funnel. Read it like a sentence:
 * "came from youtube, through the application funnel, because of video 151."
 *
 *   utm_source   = youtube        (the platform the link lives on)
 *   utm_medium   = <funnel>       (application / webinar / leadmagnet / quiz)
 *   utm_campaign = yt_<number>    (the exact video)
 */
export function buildTrackedUrl(videoId: string, destination: string): string | null {
  const dest = destination.toLowerCase()
  const base = DESTINATIONS[dest]
  if (!base) return null
  const url = new URL(base)
  url.searchParams.set('utm_source', 'youtube')
  url.searchParams.set('utm_medium', MEDIUM_BY_DESTINATION[dest] || dest)
  url.searchParams.set('utm_campaign', `yt_${videoId}`)
  return url.toString()
}

/** The short link that goes in the video description. */
export function goLink(videoId: string, destination: string): string {
  return `${GO_BASE}/${videoId}/${destination.toLowerCase()}`
}
