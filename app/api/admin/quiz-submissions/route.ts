import { NextRequest, NextResponse } from 'next/server'
import { createQuizClient } from '@/lib/quiz-supabase'

export const runtime = 'nodejs'

// Gated with the admin password because this returns client PII
// (names, emails, quiz answers).
export async function GET(req: NextRequest) {
  const password = new URL(req.url).searchParams.get('password')
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createQuizClient()
  if (!supabase) {
    return NextResponse.json({ configured: false, clients: [] })
  }

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, email, created_at, submissions(id, quiz_number, answers, submitted_at)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ configured: true, error: error.message }, { status: 500 })
  }

  const clients = (data ?? []).map((c) => ({
    ...c,
    submissions: (c.submissions ?? []).sort(
      (a: { submitted_at: string }, b: { submitted_at: string }) =>
        new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    ),
  }))

  return NextResponse.json({ configured: true, clients })
}
