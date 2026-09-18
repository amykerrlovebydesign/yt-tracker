import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildUtmUrl } from '@/lib/tracking-links'

// The link Amy shares inside the live webinar (EverWebinar) to book a call.
// go.healyourheart.school/apply → redirects to the call page with:
//   utm_source=everwebinar   (the platform the webinar runs on)
//   utm_medium=application   (the funnel — direct to book a call)
//   utm_campaign=livewebinar (which content: the live webinar)
// One fixed link, reused for every live webinar.

export async function GET(request: NextRequest) {
  const targetUrl = buildUtmUrl('call', 'application', 'livewebinar', 'everwebinar')

  if (!targetUrl) {
    return NextResponse.redirect('https://www.healyourheart.school')
  }

  supabaseAdmin
    .from('link_clicks')
    .insert({
      video_id: 'everwebinar',
      destination: 'call',
      clicked_at: new Date().toISOString(),
      user_agent: request.headers.get('user-agent') || null,
      referer: request.headers.get('referer') || null,
    })
    .then(() => {})

  return NextResponse.redirect(targetUrl)
}
