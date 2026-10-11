import type { CollectionEntry } from './collection'

export const WEEKLY_CHALLENGE_GOAL = 5
export const WEEKLY_CHALLENGE_STORAGE_KEY = 'pv-weekly-challenge-v1'

export type WeeklyChallenge = {
  weekStart: string
  baselineUnique: number
  bestUnique: number
  goal: number
}

export type SharedChallengeSnapshot = {
  version: 1
  weekStart: string
  added: number
  goal: number
  total: number
  sharedAt: string
}

function validDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function getWeekStart(now = new Date()): string {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = monday.getDay() || 7
  monday.setDate(monday.getDate() - day + 1)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

export function countUniqueOwnedCards(entries: CollectionEntry[]): number {
  return new Set(entries.filter((entry) => entry.quantity > 0).map((entry) => `${entry.language.toLowerCase()}:${entry.cardId}`)).size
}

export function parseWeeklyChallenge(value: unknown): WeeklyChallenge | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<WeeklyChallenge>
  if (!validDateKey(candidate.weekStart)
    || typeof candidate.baselineUnique !== 'number' || !Number.isInteger(candidate.baselineUnique) || candidate.baselineUnique < 0
    || typeof candidate.bestUnique !== 'number' || !Number.isInteger(candidate.bestUnique) || candidate.bestUnique < candidate.baselineUnique
    || candidate.goal !== WEEKLY_CHALLENGE_GOAL) return undefined
  return candidate as WeeklyChallenge
}

export function startWeeklyChallenge(uniqueOwned: number, now = new Date()): WeeklyChallenge {
  const count = Math.max(0, Math.floor(uniqueOwned))
  return { weekStart: getWeekStart(now), baselineUnique: count, bestUnique: count, goal: WEEKLY_CHALLENGE_GOAL }
}

export function advanceWeeklyChallenge(challenge: WeeklyChallenge, uniqueOwned: number, now = new Date()): WeeklyChallenge {
  if (challenge.weekStart !== getWeekStart(now)) return challenge
  const count = Math.max(0, Math.floor(uniqueOwned))
  return count > challenge.bestUnique ? { ...challenge, bestUnique: count } : challenge
}

export function weeklyChallengeProgress(challenge: WeeklyChallenge): number {
  return Math.min(challenge.goal, Math.max(0, challenge.bestUnique - challenge.baselineUnique))
}

export function encodeSharedChallenge(snapshot: SharedChallengeSnapshot): string {
  return btoa(JSON.stringify(snapshot)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function decodeSharedChallenge(token: string): SharedChallengeSnapshot | undefined {
  if (!token || token.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(token)) return undefined
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - token.length % 4) % 4)
    const value = JSON.parse(atob(base64)) as Partial<SharedChallengeSnapshot>
    if (value.version !== 1 || !validDateKey(value.weekStart)
      || typeof value.added !== 'number' || !Number.isInteger(value.added) || value.added < 0 || value.added > 100000
      || typeof value.goal !== 'number' || !Number.isInteger(value.goal) || value.goal < 1 || value.goal > 100
      || typeof value.total !== 'number' || !Number.isInteger(value.total) || value.total < 0 || value.total > 1000000
      || typeof value.sharedAt !== 'string' || !Number.isFinite(Date.parse(value.sharedAt))) return undefined
    return value as SharedChallengeSnapshot
  } catch {
    return undefined
  }
}
