import { isPriceReferenceStale, isVerifiedLocalQuote } from '../domain/pricing'
import type { CatalogLanguage } from '../api/sets'
import type { PriceBasis, PriceReference, TcgPlayerQuote } from '../domain/pricing'
import { money } from '../utils/money'
import { Info } from 'lucide-react'

type Props = {
  personalPrice?: number
  jumbo?: boolean
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

export function MarketPriceDisplay({ language, status, cardmarket, tcgplayer, personalPrice, jumbo }: Props) {
  cardmarket = isVerifiedLocalQuote(cardmarket,language) ? cardmarket : undefined
  tcgplayer = isVerifiedLocalQuote(tcgplayer,language) ? tcgplayer : undefined
  const asian = language === 'ja' || language === 'zh-tw'
  const cardmarketContext = cardmarket?.aggregator==='manakodex' ? `${language.toUpperCase()} · Near Mint ou mieux · hors port` : `Europe · EUR · ${language.toUpperCase()} · ${basisLabel(cardmarket?.basis)} · ${cardmarket?.condition === 'near-mint' ? 'Near Mint ou mieux, hors port' : 'état non renseigné'}${cardmarket ? ` · ${cardmarket.label}` : ''}`
  const note = cardmarket || tcgplayer
    ? cardmarket?.aggregator === 'manakodex' ? 'Annonce Cardmarket relevée par Manakodex. Prix demandé, hors reverse ; ce n’est pas une vente conclue ni un prix en direct.' : 'Prix vérifié pour cette édition et cette langue.'
    : 'Aucun prix automatique vérifié pour cette carte et sa langue. Les références multilingues et les correspondances incertaines sont exclues. Tu peux renseigner ton prix personnel dans les paramètres.'

  const cardmarketProvider = asian ? 'Référence Cardmarket' : 'Cardmarket'
  const tcgplayerContext = `Amérique du Nord · USD · EN · ${basisLabel(tcgplayer?.basis)} · état non renseigné${tcgplayer ? ` · ${tcgplayer.label}` : ''}`
  // Keep the card tile focused on one actionable figure. English cards prefer
  // their North American reference when it exists; otherwise Cardmarket is a
  // clearly European fallback inside the detailed information panel.
  const primaryValue = personalPrice !== undefined ? { value: personalPrice, currency: 'EUR' as const } : asian || jumbo ? undefined : language === 'en' && tcgplayer?.value !== undefined
    ? { value: tcgplayer.value, currency: 'USD' as const }
    : cardmarket?.value !== undefined ? { value: cardmarket.value, currency: 'EUR' as const } : undefined
  const compactAmount = primaryValue
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: primaryValue.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(primaryValue.value)
    : status === 'loading' ? '…' : '—'

  return <div className={`binder-price${asian ? ' has-local-market-gap' : ''}`} aria-label="Prix par marché">
    <span className="binder-price-compact-row" aria-label={primaryValue ? `${personalPrice!==undefined?'Prix personnel':'Prix indicatif'} ${compactAmount}` : 'Prix non vérifié'}><strong>{compactAmount}</strong></span>
    {personalPrice===undefined&&cardmarket?.aggregator==='manakodex'&&<small className="binder-price-note">Annonce {language.toUpperCase()} · {new Date(cardmarket.updatedAt!).toLocaleDateString('fr-FR')}{isPriceReferenceStale(cardmarket)?' · à actualiser':''}</small>}
    <details className="binder-price-info">
      <summary aria-label="Afficher les informations sur les prix" title="Informations sur les prix"><Info size={15}/><span>Informations</span></summary>
      <div className="binder-price-info-content">
        {personalPrice!==undefined&&<QuoteRow provider="Prix personnel" context="Valeur de ma collection" value={personalPrice}/>}
        {jumbo&&<p>Pas de cote Jumbo disponible. Renseigne ton prix dans les paramètres.</p>}
        {asian && <QuoteRow provider="Cote locale" context={language === 'ja' ? 'Japon' : 'Chinois traditionnel'} status="error" />}
        {!jumbo && (!asian || cardmarket?.value !== undefined) && <QuoteRow provider={cardmarketProvider} context={cardmarketContext} value={cardmarket?.value} currency="EUR" status={status} updatedAt={cardmarket?.updatedAt} />}
        {!jumbo && language === 'en' && <QuoteRow provider="TCGplayer" context={tcgplayerContext} value={tcgplayer?.value} currency="USD" status={status} updatedAt={tcgplayer?.updatedAt} />}
        <small className="binder-price-note">{note}{cardmarket?.aggregator!=='manakodex'?' Les moyennes de ventes sont agrégées par période, pas des transactions individuelles.':''}</small>
        {cardmarket?.sourceUrl&&<a href={cardmarket.sourceUrl} target="_blank" rel="noreferrer">Consulter le relevé source ↗</a>}
        {cardmarket?.listingUrl&&<a href={cardmarket.listingUrl} target="_blank" rel="noreferrer">Annonces {language.toUpperCase()} de cette carte ↗</a>}
        {isPriceReferenceStale(cardmarket)&&<p>Relevé de plus de 14 jours : conservé pour information, exclu des totaux et des alertes.</p>}
      </div>
    </details>
  </div>
}
