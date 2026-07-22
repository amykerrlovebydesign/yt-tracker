import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [{ data: rows, error }, { data: tokenSetting }] = await Promise.all([
    supabaseAdmin
      .from('monthly_youtube_stats')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'youtube_refresh_token')
      .single(),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    rows: rows ?? [],
    isConnected: !!tokenSetting,
  })
}
