import { useCallback, useEffect, useState } from 'react'
import type { Card } from '../types'
import { createFavorite, favoriteKey, parseFavorites, type FavoriteCard, type FavoriteInput } from '../domain/favorites'
import { readStoredJson, readStoredStringArray } from '../utils/storage'

export const FAVORITES_KEY = 'pv-favorites-v2'

export function migrateLegacyFavorites(editorialCards: Card[]): FavoriteCard[] {
  return readStoredStringArray('pv-favorites').flatMap(id => {
    const card = editorialCards.find(item => item.id === id)
    if (!card) return []
    return [createFavorite({source:'editorial',cardId:card.id,setId:card.tcgdexId?.split('-')[0],language:card.language.toLowerCase(),name:card.name,setName:card.set,localId:card.number})]
  })
}

export function useFavorites(editorialCards: Card[] = []) {
  const [favorites, setFavorites] = useState<FavoriteCard[]>(() => {
    if (localStorage.getItem(FAVORITES_KEY) !== null) return parseFavorites(readStoredJson<unknown>(FAVORITES_KEY, []))
    return migrateLegacyFavorites(editorialCards)
  })
  useEffect(() => localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)), [favorites])
  const isFavorite = useCallback((card: Pick<FavoriteCard,'source'|'cardId'|'language'|'setId'>) => favorites.some(item => item.key === favoriteKey(card)), [favorites])
  const addFavorite = useCallback((card: FavoriteInput) => setFavorites(current => {
    const next = createFavorite(card)
    return current.some(item => item.key === next.key) ? current : [next, ...current]
  }), [])
  const removeFavorite = useCallback((card: Pick<FavoriteCard,'source'|'cardId'|'language'|'setId'>) => setFavorites(current => current.filter(item => item.key !== favoriteKey(card))), [])
  const toggleFavorite = useCallback((card: FavoriteInput) => setFavorites(current => {
    const next = createFavorite(card), exists = current.some(item => item.key === next.key)
    return exists ? current.filter(item => item.key !== next.key) : [next, ...current]
  }), [])
  return {favorites, isFavorite, addFavorite, removeFavorite, toggleFavorite}
}
