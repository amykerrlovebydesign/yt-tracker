import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildUtmUrl } from '@/lib/tracking-links'

// Short link for the pinned YouTube channel/homepage button.
// go.healyourheart.school/webinar → logs source "pin" then redirects to the
// webinar page with UTMs: source=youtube, medium=webinar, campaign=homepage.

export async function GET(request: NextRequest) {
  const targetUrl = buildUtmUrl('webinar', 'webinar', 'homepage')

  if (!targetUrl) {
    return NextResponse.redirect('https://www.healyourheart.school')
  }

  supabaseAdmin
    .from('link_clicks')
    .insert({
      video_id: 'pin',
      destination: 'webinar',
      clicked_at: new Date().toISOString(),
      user_agent: request.headers.get('user-agent') || null,
      referer: request.headers.get('referer') || null,
    })
    .then(() => {})

  return NextResponse.redirect(targetUrl)
}
