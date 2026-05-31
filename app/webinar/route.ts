import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { DESTINATIONS } from '@/lib/destinations'

// Short link for the pinned YouTube channel button
// go.healyourheart.school/webinar → logs as source "pin" then redirects

export async function GET(request: NextRequest) {
  const targetUrl = DESTINATIONS['webinar']

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
