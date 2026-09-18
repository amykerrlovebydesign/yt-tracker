import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildUtmUrl } from '@/lib/tracking-links'

// The link Amy shares inside the live webinar (EverWebinar) to book a call.
// go.healyourheart.school/webinar/apply → redirects to the booking calendar:
//   https://www.healyourheart.school/calendar
// with utm_source=everwebinar, utm_medium=application, utm_campaign=livewebinar.
// This static route takes precedence over the dynamic /[videoId]/[destination].

export async function GET(request: NextRequest) {
  const targetUrl = buildUtmUrl('calendar', 'application', 'livewebinar', 'everwebinar')

  if (!targetUrl) {
    return NextResponse.redirect('https://www.healyourheart.school')
  }

  supabaseAdmin
    .from('link_clicks')
    .insert({
      video_id: 'everwebinar',
      destination: 'calendar',
      clicked_at: new Date().toISOString(),
      user_agent: request.headers.get('user-agent') || null,
      referer: request.headers.get('referer') || null,
    })
    .then(() => {})

  return NextResponse.redirect(targetUrl)
}
