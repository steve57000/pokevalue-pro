import type { ExternalCard } from '../domain/cards'
import { localizedMarketData, UNVERIFIED_PRICE_MESSAGE } from '../domain/localizedPricing'
import { formatDate } from '../utils/dates'
import { money } from '../utils/money'

export function LivePrice({ live, compact = false }: { live?: ExternalCard; compact?: boolean }) {
  const reference = live ? localizedMarketData(live).price : undefined
  const englishQuote = live ? localizedMarketData(live).tcgplayerQuote : undefined
  const isAsianCatalog = live?.language === 'ja' || live?.language === 'zh-tw'
  if (!reference && !englishQuote) return <div className="live-price unavailable"><small>Prix de marché</small><strong>Prix indisponible</strong><span>{UNVERIFIED_PRICE_MESSAGE}</span></div>
  return <div className={`live-price ${compact ? 'compact' : ''}`}>
    {reference && <>
      <small>Cardmarket · Europe · {reference.identityVerified ? reference.printingLanguage?.toUpperCase() : 'estimation multilingue'}</small>
      <strong>{money(reference.value, reference.currency)}</strong>
      <span>{reference.label}{reference.condition==='near-mint'?' · Near Mint ou mieux · hors port':''}</span>
      <em>Relevé {reference.aggregator==='manakodex'?'Manakodex':'TCGdex'} du {formatDate(reference.updatedAt ?? live?.updatedAt)}{live?.fromStaleCache ? ' · Données en cache' : ''}</em>
      {reference.sourceUrl&&<a href={reference.sourceUrl} target="_blank" rel="noreferrer">Source du relevé ↗</a>}
    </>}
    {englishQuote && <span className="live-price-secondary">TCGplayer · Amérique du Nord · anglais : <strong>{money(englishQuote.value, englishQuote.currency)}</strong> (cote USD distincte)</span>}
    {isAsianCatalog && <span className="live-price-secondary">Référence propre à cette langue d’impression.</span>}
  </div>
}
