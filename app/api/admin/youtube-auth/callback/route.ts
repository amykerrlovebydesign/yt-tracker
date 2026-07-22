import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://go.healyourheart.school'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/admin?yt_error=${encodeURIComponent(error)}`)
  }

  const { data: stateSetting } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'youtube_oauth_state')
    .single()

  if (!stateSetting) {
    return NextResponse.redirect(`${APP_URL}/admin?yt_error=invalid_state`)
  }

  const { state: storedState, expires } = JSON.parse(stateSetting.value)
  if (state !== storedState || Date.now() > expires) {
    return NextResponse.redirect(`${APP_URL}/admin?yt_error=state_expired`)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code!,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${APP_URL}/api/admin/youtube-auth/callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokens.refresh_token) {
    return NextResponse.redirect(`${APP_URL}/admin?yt_error=no_refresh_token`)
  }

  await supabaseAdmin.from('settings').upsert({
    key: 'youtube_refresh_token',
    value: tokens.refresh_token,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.redirect(`${APP_URL}/admin?yt_connected=1`)
}
