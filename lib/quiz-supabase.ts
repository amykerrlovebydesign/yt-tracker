import { createClient } from '@supabase/supabase-js'

/**
 * Client for the separate Somatic Quiz Supabase project (clients + submissions).
 * Kept in its own file so the quiz tabs don't depend on the YouTube project's
 * env vars being present. Returns null when unconfigured so the API can respond
 * with a clear "not connected" state instead of throwing at import time.
 */
export function createQuizClient() {
  const url = process.env.QUIZ_SUPABASE_URL
  const key = process.env.QUIZ_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}
