import type { ExternalCard } from '../domain/cards'
import { selectCardmarketPrice } from '../domain/pricing'
import { formatDate } from '../utils/dates'
import { money } from '../utils/money'

export function LivePrice({ live, compact = false }: { live?: ExternalCard; compact?: boolean }) {
  const reference = selectCardmarketPrice(live?.pricing)
  if (!reference) return <div className="live-price unavailable"><small>Prix marché actualisé</small><strong>Prix indisponible</strong><span>Cardmarket via TCGdex</span></div>
  return <div className={`live-price ${compact ? 'compact' : ''}`}>
    <small>Prix marché actualisé</small>
    <strong>{money(reference.value, reference.currency)}</strong>
    <span>{reference.label}</span>
    <em>Cardmarket via TCGdex · Mis à jour le {formatDate(reference.updatedAt ?? live?.updatedAt)}{live?.fromStaleCache ? ' · Données en cache' : ''}</em>
  </div>
}
