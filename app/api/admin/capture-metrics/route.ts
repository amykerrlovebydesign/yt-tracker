import { NextRequest, NextResponse } from 'next/server'
import { captureDueSnapshots } from '@/lib/capture-metrics'

export const runtime = 'nodejs'
export const maxDuration = 60

// GET  → daily Vercel cron (catches videos as they hit day 7).
// POST → manual "Capture due" button (password-gated), for the VA / backfill.
export async function GET() {
  try {
    const result = await captureDueSnapshots()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const password = new URL(req.url).searchParams.get('password')
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await captureDueSnapshots()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
