import cards from './deltaReignCards.json'
import type { SetDetail, SetSummary } from '../api/sets'

export const deltaReignLogo = 'https://www.pokepedia.fr/images/thumb/0/0a/Logo_M%C3%A9ga-%C3%89volution_R%C3%A8gne_Delta_JCC.png/800px-Logo_M%C3%A9ga-%C3%89volution_R%C3%A8gne_Delta_JCC.png'
export const deltaReignSummary = (language: string): SetSummary => ({
  id: 'me06', name: language === 'en' ? 'Mega Evolution—Delta Reign' : 'Méga-Évolution – Règne Delta',
  cardCount: { total: 141, official: 103 }, releaseDate: '2026-11-06', upcoming: false,
  logo: deltaReignLogo, serie: { id: 'me', name: language === 'en' ? 'Mega Evolution' : 'Méga-Évolution' },
})
export const deltaReignDetail = (language: string): SetDetail => ({
  ...deltaReignSummary(language),
  serie: { id: 'me', name: language === 'en' ? 'Mega Evolution' : 'Méga-Évolution' },
  cards: cards[language === 'en' ? 'en' : 'fr'],
})
