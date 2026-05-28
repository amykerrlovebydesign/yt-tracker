import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { video_id, revenue } = await request.json()

  const { error } = await supabaseAdmin
    .from('video_revenue')
    .upsert({ video_id, revenue }, { onConflict: 'video_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
