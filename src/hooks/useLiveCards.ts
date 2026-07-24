import { useCallback, useEffect, useMemo, useState } from 'react'
import { tcgDexProvider } from '../api/tcgdex'
import type { ExternalCard } from '../domain/cards'
import type { Card } from '../types'

export type LiveEntry = { status: 'idle' | 'loading' | 'success' | 'error'; data?: ExternalCard; error?: string }

export function tcgDexLanguageForCard(card: Pick<Card, 'language'>): 'fr' | 'en' {
  return card.language === 'FR' ? 'fr' : 'en'
}

export function useLiveCards(cards: Card[]) {
  const mappedCards = useMemo(() => cards.filter((card) => card.tcgdexId), [cards])
  const [entries, setEntries] = useState<Record<string, LiveEntry>>({})
  const [retryNonce, setRetryNonce] = useState(0)

  const retry = useCallback((id: string) => {
    setEntries((current) => ({ ...current, [id]: { status: 'loading' } }))
    setRetryNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    let active = true
    if (mappedCards.length === 0) return

    setEntries((current) => {
      const next = { ...current }
      for (const card of mappedCards) {
        if (next[card.id]?.status !== 'success') next[card.id] = { status: 'loading' }
      }
      return next
    })

    Promise.allSettled(mappedCards.map((card) =>
      tcgDexProvider
        .getCard(card.tcgdexId!, tcgDexLanguageForCard(card))
        .then((data) => ({ id: card.id, data })),
    )).then((results) => {
      if (!active) return
      setEntries((current) => {
        const next = { ...current }
        results.forEach((result, index) => {
          const card = mappedCards[index]
          if (result.status === 'fulfilled') next[result.value.id] = { status: 'success', data: result.value.data }
          else next[card.id] = { status: 'error', error: result.reason instanceof Error ? result.reason.message : 'Erreur API inconnue' }
        })
        return next
      })
    })

    return () => { active = false }
  }, [mappedCards, retryNonce])

  return { entries, retry }
}
