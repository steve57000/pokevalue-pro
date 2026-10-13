import type { ExternalCard } from '../domain/cards'
import { selectCardmarketPrice, selectTcgplayerPrice } from '../domain/pricing'
import { formatDate } from '../utils/dates'
import { money } from '../utils/money'

export function LivePrice({ live, compact = false }: { live?: ExternalCard; compact?: boolean }) {
  const reference = selectCardmarketPrice(live?.pricing)
  const englishQuote = live?.language === 'en' ? selectTcgplayerPrice(live.pricing) : undefined
  const isAsianCatalog = live?.language === 'ja' || live?.language === 'zh-tw'
  if (!reference && !englishQuote) return <div className="live-price unavailable"><small>Prix de marché</small><strong>Prix indisponible</strong><span>{isAsianCatalog ? 'Aucune source de prix local asiatique n’est connectée.' : 'Sources Cardmarket Europe et TCGplayer Amérique du Nord'}</span></div>
  return <div className={`live-price ${compact ? 'compact' : ''}`}>
    {reference && <>
      <small>Cardmarket · Europe · toutes langues</small>
      <strong>{money(reference.value, reference.currency)}</strong>
      <span>{reference.label} · langue non filtrée</span>
      <em>Cardmarket via TCGdex · Mis à jour le {formatDate(reference.updatedAt ?? live?.updatedAt)}{live?.fromStaleCache ? ' · Données en cache' : ''}</em>
    </>}
    {englishQuote && <span className="live-price-secondary">TCGplayer · Amérique du Nord · anglais : <strong>{money(englishQuote.value, englishQuote.currency)}</strong> (cote USD distincte)</span>}
    {isAsianCatalog && <span className="live-price-secondary">Aucune cotation locale japonaise/chinoise disponible; la référence Cardmarket est européenne, non filtrée par langue.</span>}
  </div>
}
