// Self-contained analytics for the Somatic Quiz data, ported from the quiz app.
// Only the domain metadata needed for scoring is kept here (not the full
// question text / bands) since the dashboard only shows aggregates.

export type AnswerMap = Record<string, number>

export interface AdminSubmission {
  id: string
  quiz_number: number
  answers: AnswerMap
  submitted_at: string
}

export interface AdminClient {
  id: string
  name: string
  email: string
  created_at: string
  submissions: AdminSubmission[]
}

interface DomainMeta {
  id: string
  name: string
  keys: string[]
}

// 9 outcome domains, each scored from 3 questions (a/b/c). Retake quizzes
// (2–4) only cover domains 1–4.
export const DOMAINS: DomainMeta[] = [
  { id: '1', name: 'Somatic Awareness & Access' },
  { id: '2', name: 'Felt Sense of Safety in the Body' },
  { id: '3', name: 'Pattern Interruption' },
  { id: '4', name: 'Self-Connection & Self-Trust' },
  { id: '5', name: 'Nervous System Resilience in Relationships' },
  { id: '6', name: 'Boundaries & Discernment' },
  { id: '7', name: 'Being OK on Your Own' },
  { id: '8', name: 'Embodied Identity' },
  { id: '9', name: 'Embodied Standards & Non-Negotiables' },
].map((d) => ({ ...d, keys: [`${d.id}a`, `${d.id}b`, `${d.id}c`] }))

export const ALL_QUESTION_KEYS = DOMAINS.flatMap((d) => d.keys)

/** Average of the answered questions in a domain (0 when none answered). */
function scoreDomain(domain: DomainMeta, answers: AnswerMap): number {
  const values = domain.keys
    .map((k) => answers[k])
    .filter((v): v is number => v != null && v > 0)
  if (!values.length) return 0
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

const LOW_THRESHOLD = 4
const HIGH_THRESHOLD = 8

export function getBaseline(client: AdminClient): AdminSubmission | null {
  return client.submissions.find((s) => s.quiz_number === 1) ?? null
}

export function getLatestRetake(client: AdminClient): AdminSubmission | null {
  const retakes = client.submissions.filter((s) => s.quiz_number > 1)
  return retakes.length ? retakes[retakes.length - 1] : null
}

export interface DomainLandscape {
  domainId: string
  domainName: string
  n: number
  avg: number
  pctLow: number
}

/** Where clients arrive — average Quiz 1 score per domain, across all clients. */
export function baselineLandscape(clients: AdminClient[]): DomainLandscape[] {
  return DOMAINS.map((domain) => {
    const scores: number[] = []
    for (const client of clients) {
      const baseline = getBaseline(client)
      if (!baseline) continue
      const s = scoreDomain(domain, baseline.answers)
      if (s > 0) scores.push(s)
    }
    const n = scores.length
    const avg = n ? scores.reduce((a, b) => a + b, 0) / n : 0
    const low = scores.filter((s) => s <= LOW_THRESHOLD).length
    return {
      domainId: domain.id,
      domainName: domain.name,
      n,
      avg: Math.round(avg * 10) / 10,
      pctLow: n ? Math.round((low / n) * 100) : 0,
    }
  })
}

export interface DomainMovement {
  domainId: string
  domainName: string
  n: number
  avgBefore: number
  avgAfter: number
  avgChange: number
  pctImproved: number
}

export interface TransformationStats {
  clientsRetaken: number
  avgOverallGrowth: number | null
  domains: DomainMovement[]
}

function calcOverallGrowth(
  current: { domainId: string; score: number }[],
  baseline: { domainId: string; score: number }[]
): number {
  let gained = 0
  let possible = 0
  for (const c of current) {
    const b = baseline.find((x) => x.domainId === c.domainId)
    if (b) {
      gained += Math.max(0, c.score - b.score)
      possible += Math.max(0, 10 - b.score)
    }
  }
  return possible > 0 ? Math.round((gained / possible) * 100) : 0
}

/** How clients change — Quiz 1 vs each client's most recent retake (once each). */
export function transformation(clients: AdminClient[]): TransformationStats {
  const retakeDomains = DOMAINS.filter((d) => Number(d.id) <= 4)
  const perDomain: Record<
    string,
    { changes: number[]; before: number[]; after: number[]; improved: number }
  > = {}
  retakeDomains.forEach((d) => (perDomain[d.id] = { changes: [], before: [], after: [], improved: 0 }))

  const growthValues: number[] = []
  let clientsRetaken = 0

  for (const client of clients) {
    const baseline = getBaseline(client)
    const retake = getLatestRetake(client)
    if (!baseline || !retake) continue
    clientsRetaken++

    const currentScores: { domainId: string; score: number }[] = []
    const baselineScores: { domainId: string; score: number }[] = []
    for (const domain of retakeDomains) {
      const before = scoreDomain(domain, baseline.answers)
      const after = scoreDomain(domain, retake.answers)
      if (before > 0 && after > 0) {
        perDomain[domain.id].changes.push(after - before)
        perDomain[domain.id].before.push(before)
        perDomain[domain.id].after.push(after)
        if (after > before) perDomain[domain.id].improved++
        currentScores.push({ domainId: domain.id, score: after })
        baselineScores.push({ domainId: domain.id, score: before })
      }
    }
    if (currentScores.length) growthValues.push(calcOverallGrowth(currentScores, baselineScores))
  }

  const mean = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0

  const domains: DomainMovement[] = retakeDomains.map((d) => {
    const { changes, before, after, improved } = perDomain[d.id]
    const n = changes.length
    return {
      domainId: d.id,
      domainName: d.name,
      n,
      avgBefore: mean(before),
      avgAfter: mean(after),
      avgChange: mean(changes),
      pctImproved: n ? Math.round((improved / n) * 100) : 0,
    }
  })

  return {
    clientsRetaken,
    avgOverallGrowth: growthValues.length
      ? Math.round(growthValues.reduce((a, b) => a + b, 0) / growthValues.length)
      : null,
    domains,
  }
}

export interface QuizSummary {
  totalClients: number
  totalSubmissions: number
  clientsWithBaseline: number
  quizCounts: Record<number, number>
  avgBaselineOverall: number | null
}

export function summarise(clients: AdminClient[], landscape: DomainLandscape[]): QuizSummary {
  const allSubs = clients.flatMap((c) => c.submissions)
  const quizCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  allSubs.forEach((s) => {
    quizCounts[s.quiz_number] = (quizCounts[s.quiz_number] ?? 0) + 1
  })

  const answered = landscape.filter((d) => d.n > 0)
  const avgBaselineOverall = answered.length
    ? Math.round((answered.reduce((a, d) => a + d.avg, 0) / answered.length) * 10) / 10
    : null

  return {
    totalClients: clients.length,
    totalSubmissions: allSubs.length,
    clientsWithBaseline: clients.filter((c) => getBaseline(c)).length,
    quizCounts,
    avgBaselineOverall,
  }
}
