import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const password = new URL(req.url).searchParams.get('password')
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('video_metrics_snapshots')
    .select('*')
    .order('published_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

// Save the manual "velocity" rating (Below/Average/Above average) for one video.
export async function PATCH(req: NextRequest) {
  const password = new URL(req.url).searchParams.get('password')
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  if (!body?.video_id) return NextResponse.json({ error: 'video_id required' }, { status: 400 })
  const { error } = await supabaseAdmin
    .from('video_metrics_snapshots')
    .update({ velocity: body.velocity ?? null })
    .eq('video_id', body.video_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
