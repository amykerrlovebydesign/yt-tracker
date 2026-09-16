import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { buildNewsletterUrl, normalizeDateCode } from '@/lib/tracking-links'

// Newsletter tracking link: go.healyourheart.school/nl/<destination>/<date>
// e.g. /nl/call/16-9-26 → redirects to the call page with
// utm_source=newsletter, utm_medium=application, utm_campaign=16-9-26
// The date is typo-tolerant (16-09-26 also works) and normalised to no zeros.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ destination: string; date: string }> }
) {
  const { destination, date } = await params
  const targetUrl = buildNewsletterUrl(date, destination)

  // Unknown destination or unparseable date → send to main site.
  if (!targetUrl) {
    return NextResponse.redirect('https://www.healyourheart.school')
  }

  const code = normalizeDateCode(date)

  // Log the click (fire and forget). Tagged nl:<date> so newsletter clicks are
  // distinguishable from video clicks in the same link_clicks table.
  supabaseAdmin
    .from('link_clicks')
    .insert({
      video_id: `nl:${code}`,
      destination: destination.toLowerCase(),
      clicked_at: new Date().toISOString(),
      user_agent: request.headers.get('user-agent') || null,
      referer: request.headers.get('referer') || null,
    })
    .then(() => {})

  return NextResponse.redirect(targetUrl)
}
