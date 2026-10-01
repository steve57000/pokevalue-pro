export type FavoriteSource = 'tcgdex' | 'editorial'

export type FavoriteCard = {
  key: string
  source: FavoriteSource
  cardId: string
  setId?: string
  language: string
  name: string
  setName: string
  localId?: string
  image?: string
  addedAt: string
}

export type FavoriteInput = Omit<FavoriteCard, 'key' | 'addedAt'> & Partial<Pick<FavoriteCard, 'addedAt'>>

export const favoriteKey = (card: Pick<FavoriteCard, 'source' | 'cardId' | 'language' | 'setId'>) =>
  [card.source, card.language.toLowerCase(), card.setId ?? '', card.cardId].join(':')

export const createFavorite = (card: FavoriteInput): FavoriteCard => ({
  ...card,
  language: card.language.toLowerCase(),
  key: favoriteKey(card),
  addedAt: card.addedAt ?? new Date().toISOString(),
})

export function parseFavorites(value: unknown): FavoriteCard[] {
  if (!Array.isArray(value)) return []
  const result = new Map<string, FavoriteCard>()
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Partial<FavoriteCard>
    if (!candidate.cardId || !candidate.name || !candidate.language || !candidate.source) continue
    const favorite = createFavorite({
      source: candidate.source,
      cardId: candidate.cardId,
      setId: candidate.setId,
      language: candidate.language,
      name: candidate.name,
      setName: candidate.setName ?? 'Extension inconnue',
      localId: candidate.localId,
      image: candidate.image,
      addedAt: candidate.addedAt,
    })
    result.set(favorite.key, favorite)
  }
  return [...result.values()]
}
