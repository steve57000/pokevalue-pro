import { describe, expect, it } from 'vitest'
import { decodeSharedChallenge, encodeSharedChallenge, getWeekStart, parseWeeklyChallenge, startWeeklyChallenge, weeklyChallengeProgress } from './weeklyChallenge'

describe('weekly collection challenge', () => {
  it('starts the week on Monday and advances only the current week', () => {
    const monday = new Date(2026, 9, 12, 12)
    expect(getWeekStart(monday)).toBe('2026-10-12')
    const challenge = startWeeklyChallenge(20, monday)
    expect(parseWeeklyChallenge(challenge)).toEqual(challenge)
    expect(weeklyChallengeProgress({ ...challenge, bestUnique: 23 })).toBe(3)
  })

  it('shares only a validated aggregate snapshot', () => {
    const snapshot = { version: 1 as const, weekStart: '2026-10-12', added: 4, goal: 5, total: 28, sharedAt: '2026-10-14T12:00:00.000Z' }
    expect(decodeSharedChallenge(encodeSharedChallenge(snapshot))).toEqual(snapshot)
    expect(decodeSharedChallenge('not-a-snapshot')).toBeUndefined()
  })
})
