export type Card = {
  id: string
  name: string
  pokemon: string
  set: string
  year: number
  number: string
  rarity: string
  language: 'FR' | 'EN' | 'JP'
  rawMin: number
  rawMax: number
  graded10: number
  trend: 'up' | 'stable' | 'down'
  score: number
  featured?: boolean
  color: string
  accent: string
  note: string
}
