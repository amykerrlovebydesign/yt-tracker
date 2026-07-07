import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { video_id, views } = await request.json()

  const { error } = await supabaseAdmin
    .from('video_revenue')
    .upsert({ video_id, views }, { onConflict: 'video_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
