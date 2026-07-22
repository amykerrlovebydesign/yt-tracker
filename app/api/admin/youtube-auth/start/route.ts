import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { randomBytes } from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://go.healyourheart.school'

export async function GET() {
  const state = randomBytes(16).toString('hex')

  await supabaseAdmin.from('settings').upsert({
    key: 'youtube_oauth_state',
    value: JSON.stringify({ state, expires: Date.now() + 10 * 60 * 1000 }),
    updated_at: new Date().toISOString(),
  })

  const scopes = [
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${APP_URL}/api/admin/youtube-auth/callback`,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
