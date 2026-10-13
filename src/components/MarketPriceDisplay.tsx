import type { CatalogLanguage } from '../api/sets'
import type { PriceBasis, PriceReference, TcgPlayerQuote } from '../domain/pricing'
import { money } from '../utils/money'

type Props = {
  language: CatalogLanguage
  status?: 'loading' | 'success' | 'error'
  cardmarket?: PriceReference | null
  tcgplayer?: TcgPlayerQuote
}

type QuoteRowProps = {
  provider: string
  context: string
  value?: number
  currency?: 'EUR' | 'USD'
  status?: Props['status']
  updatedAt?: string
}

const basisLabel = (basis?: PriceBasis) => basis === 'listing' ? 'annonce / offre agrégée'
  : basis === 'completed-sale' ? 'ventes conclues agrégées'
    : basis === 'unknown' ? 'base non précisée' : 'guide'

function QuoteRow({ provider, context, value, currency = 'EUR', status, updatedAt }: QuoteRowProps) {
  const amount = value === undefined ? status === 'loading' ? 'Chargement…' : 'Indisponible' : money(value, currency)
  const updated = updatedAt ? `Dernière mise à jour : ${new Date(updatedAt).toLocaleDateString('fr-FR')}` : undefined
  return <div className="binder-price-row" title={updated}>
    <span className="binder-price-provider"><strong>{provider}</strong><small>{context}</small></span>
    <span className={`binder-price-quote${value === undefined ? ' unavailable' : ''}`}>{amount}</span>
  </div>
}

export function MarketPriceDisplay({ language, status, cardmarket, tcgplayer }: Props) {
  const asian = language === 'ja' || language === 'zh-tw'
  const cardmarketContext = `Europe · EUR · ${basisLabel(cardmarket?.basis)} · impression et état non renseignés${cardmarket ? ` · ${cardmarket.label}` : ''}`
  const note = language === 'fr'
    ? 'Cardmarket Europe · langue et impression non filtrées : pas une cote française.'
    : language === 'en'
      ? 'TCGplayer couvre l’Amérique du Nord, pas le Royaume-Uni; certaines réimpressions TCGdex peuvent être mal reliées.'
      : 'Aucune cote locale vérifiée. Cardmarket Europe est séparé du marché asiatique et l’impression peut différer.'

  return <div className={`binder-price${asian ? ' has-local-market-gap' : ''}`} aria-label="Prix par marché">
    {asian && <QuoteRow provider="Cote locale" context={language === 'ja' ? 'Japon' : 'Chinois traditionnel'} status="error" />}
    {(!asian || cardmarket?.value !== undefined) && <QuoteRow
      provider={asian ? 'Référence Cardmarket' : 'Cardmarket'}
      context={cardmarketContext}
      value={cardmarket?.value}
      currency="EUR"
      status={status}
      updatedAt={cardmarket?.updatedAt}
    />}
    {language === 'en' && <QuoteRow
      provider="TCGplayer"
      context={`Amérique du Nord · USD · ${basisLabel(tcgplayer?.basis)} · impression et état non renseignés${tcgplayer ? ` · ${tcgplayer.label}` : ''}`}
      value={tcgplayer?.value}
      currency="USD"
      status={status}
      updatedAt={tcgplayer?.updatedAt}
    />}
    <small className="binder-price-note">{note} Les moyennes de ventes sont agrégées par période, pas des transactions individuelles.</small>
  </div>
}
