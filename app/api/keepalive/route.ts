import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Cron job endpoint — called daily by Vercel to keep Supabase from pausing
export async function GET() {
  const { count, error } = await supabaseAdmin
    .from('link_clicks')
    .select('*', { count: 'exact', head: true })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ping: new Date().toISOString(), total_clicks: count })
}
