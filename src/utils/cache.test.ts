import { describe, expect, it } from 'vitest'
import { getCached, LIVE_CARD_TTL_MS, setCached, STALE_WHILE_REFRESH_MS } from './cache'

describe('cache', () => {
  it('retourne une donnée encore valide', () => {
    setCached('fresh', { ok: true }, 1_000)
    expect(getCached<{ ok: boolean }>('fresh', 1_000 + LIVE_CARD_TTL_MS - 1)).toMatchObject({ data: { ok: true }, isFresh: true, isStale: false })
  })

  it('retourne une donnée expirée de moins de 24 heures comme stale', () => {
    setCached('stale', { ok: true }, 1_000)
    expect(getCached<{ ok: boolean }>('stale', 1_000 + LIVE_CARD_TTL_MS + 1)).toMatchObject({ data: { ok: true }, isFresh: false, isStale: true })
  })

  it('ignore une donnée trop ancienne', () => {
    setCached('expired', { ok: true }, 1_000)
    expect(getCached('expired', 1_000 + STALE_WHILE_REFRESH_MS + 1)).toBeUndefined()
  })
})
