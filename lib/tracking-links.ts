import { DESTINATIONS } from './destinations'

// The public short-link domain used in YouTube descriptions.
export const GO_BASE = 'https://go.healyourheart.school'

/**
 * The single source of truth for what a YouTube tracking link redirects to.
 * Appends UTM labels derived from the video number so downstream tools
 * (Calendly, Kartra, GA) can attribute a lead to the exact video + CTA.
 *
 *   utm_source   = youtube        (the platform)
 *   utm_medium   = video          (the channel type)
 *   utm_campaign = yt_<number>    (the exact video)
 *   utm_content  = <destination>  (which button: call/webinar/quiz/guide)
 */
export function buildTrackedUrl(videoId: string, destination: string): string | null {
  const base = DESTINATIONS[destination.toLowerCase()]
  if (!base) return null
  const url = new URL(base)
  url.searchParams.set('utm_source', 'youtube')
  url.searchParams.set('utm_medium', 'video')
  url.searchParams.set('utm_campaign', `yt_${videoId}`)
  url.searchParams.set('utm_content', destination.toLowerCase())
  return url.toString()
}

/** The short link that goes in the video description. */
export function goLink(videoId: string, destination: string): string {
  return `${GO_BASE}/${videoId}/${destination.toLowerCase()}`
}
