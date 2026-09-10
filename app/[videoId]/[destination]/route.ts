import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildTrackedUrl } from '@/lib/tracking-links'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string; destination: string }> }
) {
  const { videoId, destination } = await params
  const targetUrl = buildTrackedUrl(videoId, destination)

  // If destination is unknown, redirect to main site
  if (!targetUrl) {
    return NextResponse.redirect('https://www.healyourheart.school')
  }

  // Log the click to Supabase (fire and forget — don't slow down the redirect)
  supabaseAdmin
    .from('link_clicks')
    .insert({
      video_id: videoId,
      destination: destination.toLowerCase(),
      clicked_at: new Date().toISOString(),
      user_agent: request.headers.get('user-agent') || null,
      referer: request.headers.get('referer') || null,
    })
    .then(() => {}) // intentionally not awaited

  return NextResponse.redirect(targetUrl)
}
