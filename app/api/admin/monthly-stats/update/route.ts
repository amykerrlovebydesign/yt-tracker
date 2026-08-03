import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { year, month, field, value } = body

  if (!year || !month || !field) {
    return NextResponse.json({ error: 'Missing year, month, or field' }, { status: 400 })
  }

  const allowed = ['total_subscribers', 'impressions']
  if (!allowed.includes(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('monthly_youtube_stats')
    .update({ [field]: value })
    .eq('year', year)
    .eq('month', month)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
