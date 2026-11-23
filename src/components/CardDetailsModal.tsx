import {useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {ExternalLink,Heart,Minus,Plus,X} from 'lucide-react'
import type {SetCard} from '../api/sets'
import {collectionUnitPrice,type CollectionEntry} from '../domain/collection'
import {getGradingInterest} from '../domain/grading'
import {getPriceHistory} from '../domain/priceHistory'
import type {CardPriceState} from '../hooks/useCardPrices'
import {useModalDialog} from '../hooks/useModalDialog'
import {CatalogueImage} from './CatalogueImage'
import {money} from '../utils/money'
import {buildCardmarketUrl} from '../domain/cardmarket'
import {collectionMarketValue,isPriceReferenceStale,isAsianCatalogLanguage} from '../domain/pricing'

type Tab='overview'|'price'|'collection'|'grading'
type Props={jumbo?:boolean;card:SetCard;setName:string;language:string;entry?:CollectionEntry;price?:CardPriceState;favorite?:boolean;onFavorite?:()=>void;onQuantity:(quantity:number)=>void;onEdit:()=>void;onShowcase?:()=>void;onClose:()=>void}
const languageName:Record<string,string>={fr:'français',en:'anglais',ja:'japonais','zh-tw':'chinois traditionnel'}
const basisName=(basis?:string)=>basis==='listing'?'offre agrégée':basis==='completed-sale'?'moyenne de ventes conclues':basis==='guide'?'prix guide':basis==='unknown'?'base inconnue':'prix guide'
export const collectionValue=(entry?:Pick<CollectionEntry,'manualPrice'|'priceMode'|'quantity'>,automaticPrice?:number)=>{if(!entry)return undefined;const unit=collectionUnitPrice(entry,automaticPrice);return unit===undefined?undefined:unit*entry.quantity}
function Sparkline({points}:{points:{date:string;value:number}[]}){if(points.length<2)return <p className="history-building">L’historique se construit au fil des relevés quotidiens de l’application.</p>;const values=points.map(x=>x.value),min=Math.min(...values),max=Math.max(...values),span=max-min||1,coords=points.map((x,i)=>({x:18+i/(points.length-1)*284,y:116-(x.value-min)/span*94})),path=coords.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');return <><div className="history-chart-summary"><strong>{money(points[points.length-1].value)}</strong><span>{new Date(points[0].date).toLocaleDateString('fr-FR')} — {new Date(points[points.length-1].date).toLocaleDateString('fr-FR')}</span><small>Min. {money(min)} · Max. {money(max)}</small></div><svg className="price-sparkline" viewBox="0 0 320 142" role="img" aria-label={`Évolution du prix de ${money(points[0].value)} à ${money(points[points.length-1].value)}`}><path className="chart-grid" d="M18 22H302M18 69H302M18 116H302"/><path className="chart-area" d={`${path} L302 130 L18 130 Z`}/><path className="chart-line" d={path}/>{coords.map((p,i)=><circle key={`${points[i].date}-${i}`} cx={p.x} cy={p.y} r={i===coords.length-1?3.5:2}/>)}</svg></>}
export function CardDetailsModal({card,setName,language,entry,price,favorite,onFavorite,onQuantity,onEdit,onShowcase,onClose,jumbo=false}:Props){
 const [tab,setTab]=useState<Tab>('overview'),dialogRef=useModalDialog(onClose)
 const asian=isAsianCatalogLanguage(language),history=useMemo(()=>asian||jumbo?[]:getPriceHistory(card.id,language),[card.id,language,asian,jumbo,price?.checkedAt]),cm=price?.cardmarket,tcgplayerQuote=price?.quotes?.find(quote=>quote.source==='tcgplayer'&&quote.variant==='normal'&&quote.basis==='guide')
 const automaticPrice=asian||jumbo?undefined:collectionMarketValue(price?.price,language,entry?.condition)
 const grading=getGradingInterest({rawPrice:entry?collectionUnitPrice(entry,automaticPrice):automaticPrice,rarity:card.rarity,...(asian?{}:{trend:cm?.trend,avg30:cm?.avg30,avg7:cm?.avg7,low:cm?.low})})
 const value=collectionValue(entry,automaticPrice),marketUrl=buildCardmarketUrl({...card,setName,language})
 const stat=(label:string,n?:number)=><div><span>{label}</span><strong>{n===undefined?'Indisponible':money(n)}</strong></div>
 return createPortal(<div className="details-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section ref={dialogRef} className="card-details" role="dialog" aria-modal="true" aria-labelledby="details-title" aria-describedby="details-description"><button className="details-close" onClick={onClose} aria-label="Fermer les détails"><X/></button>
  <div className="details-hero"><button className="details-image-button" onClick={onShowcase} disabled={!onShowcase} aria-label={`Voir ${card.name} en grand`}><CatalogueImage card={card} quality="high" requestedLanguage={language}/></button><div><span className="eyebrow">Fiche carte</span><h2 id="details-title">{card.name}</h2><p id="details-description">Nº {card.localId} · {setName}</p><p>Carte affichée : {languageName[language]??language} · rareté {card.rarity||'non renseignée'}</p>{grading.level!=='low'&&<span className="grading-badge" title="Potentiel à étudier — estimation basée sur prix, rareté et tendance">★ Potentiel gradation</span>}</div></div>
  <nav className="details-tabs" aria-label="Sections de la fiche">{([['overview','Aperçu'],['price','Prix'],['collection','Collection'],['grading','Gradation']] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  <div className="details-quick-actions" aria-label="Actions de la carte">
   <div className="details-quantity" aria-label={`Quantité possédée : ${entry?.quantity??0}`}><button onClick={()=>onQuantity(Math.max(0,(entry?.quantity??0)-1))} disabled={!entry?.quantity} aria-label="Retirer un exemplaire"><Minus/></button><strong>×{entry?.quantity??0}</strong><button onClick={()=>onQuantity((entry?.quantity??0)+1)} aria-label="Ajouter un exemplaire"><Plus/></button></div>
   <button className="details-action" onClick={onEdit}><span>Modifier</span></button>
   {onFavorite&&<button className="details-action" onClick={onFavorite}><Heart size={17} fill={favorite?'currentColor':'none'}/><span>{favorite?'Favori':'Favoris'}</span></button>}
   {onShowcase&&<button className="details-action" onClick={onShowcase}><span>Voir en grand</span></button>}
   <a className="details-action" href={marketUrl} target="_blank" rel="noopener noreferrer"><span>Cardmarket</span><ExternalLink size={15}/></a>
  </div>
  {tab==='overview'&&<section><h3>Aperçu</h3>{entry&&<p>Ma collection : <strong>{entry.quantity} exemplaire{entry.quantity===1?'':'s'} · {value===undefined?'prix à renseigner':money(value)}</strong></p>}<p>{jumbo?'Cote Jumbo indisponible.':price?.price?`${price.price.basis==='listing'?'Annonce datée':'Prix vérifié'} · ${language.toUpperCase()} : ${money(price.price.value)}${price.price.updatedAt?` · ${new Date(price.price.updatedAt).toLocaleDateString('fr-FR')}`:''}`:'Prix non vérifié pour cette langue'}</p><small>Les prix sans édition et langue vérifiées sont exclus.</small></section>}
  {tab==='price'&&<section><h3>Prix · {language.toUpperCase()}</h3>
   {!price?.price&&<p>Prix non vérifié pour cette édition et cette langue. Les prix personnels restent utilisables.</p>}
   {price?.price&&<>
    <div className="price-stat-grid">{stat(price.price.label,price.price.value)}{cm?.trend!==undefined&&stat('Tendance · guide',cm.trend)}{cm?.avg!==undefined&&stat('Prix de vente moyen',cm.avg)}{cm?.avg1!==undefined&&stat('Ventes · moyenne 1 jour',cm.avg1)}{cm?.avg7!==undefined&&stat('Ventes · moyenne 7 jours',cm.avg7)}{cm?.avg30!==undefined&&stat('Ventes · moyenne 30 jours',cm.avg30)}</div>
    <p>{price.price.condition==='near-mint'?'Near Mint ou mieux · hors port · hors reverse. ':''}Relevé du {price.price.updatedAt?new Date(price.price.updatedAt).toLocaleDateString('fr-FR'):'jour non renseigné'}.</p>
    {price.price.basis==='listing'&&<p>Prix demandé dans les annonces, pas une vente conclue. Ce relevé daté ne s’actualise pas en direct.</p>}
    {isPriceReferenceStale(price.price)&&<p>Relevé de plus de 14 jours : à actualiser. Il ne contribue plus aux totaux ni aux alertes.</p>}
    <details><summary>Source et correspondance de la carte</summary><dl className="price-provenance">
     <div><dt>Source</dt><dd>Cardmarket via {price.price.aggregator==='manakodex'?'Manakodex':'TCGdex'}</dd></div>
     <div><dt>Carte</dt><dd>{setName} · {card.localId} · {languageName[language]??language}</dd></div>
     <div><dt>Marché et devise</dt><dd>Europe · EUR · {basisName(price.price.basis)}</dd></div>
    </dl>{price.price.sourceUrl&&<p><a href={price.price.sourceUrl} target="_blank" rel="noreferrer">Consulter le relevé Manakodex ↗</a></p>}{price.price.listingUrl&&<p><a href={price.price.listingUrl} target="_blank" rel="noreferrer">Annonces de cette carte en {languageName[language]} ↗</a></p>}</details>
   </>}
   {language==='en'&&price?.tcgplayerQuote&&<p>TCGplayer · Amérique du Nord · anglais : <strong>{money(price.tcgplayerQuote.value,'USD')}</strong> · {basisName(tcgplayerQuote?.basis)}. Cette référence USD reste séparée du montant européen en EUR.</p>}
   <div className="price-history"><h4>Historique PokéValue</h4><p>Courbe des prix guide vérifiés. Les annonces datées restent séparées et ne créent pas de fausse évolution quotidienne.</p><Sparkline points={history}/></div>
  </section>}
  {tab==='collection'&&<section><h3>Collection</h3><p>{entry?.quantity??0} exemplaire{entry?.quantity===1?'':'s'} · valeur : <strong>{value===undefined?'indisponible':money(value)}</strong></p>{entry?.manualPrice!==undefined&&(entry.priceMode??'manual')==='manual'&&<p>Prix personnalisé utilisé : {money(entry.manualPrice)} par exemplaire.</p>}</section>}
  {tab==='grading'&&<section><h3>Gradation</h3>{entry?.gradedCopies?.map(copy=><p key={copy.id}><strong>{copy.company} {copy.grade}</strong>{copy.certificate?` · Certificat ${copy.certificate}`:""}</p>)}<p><strong>Potentiel {grading.level==='high'?'élevé':grading.level==='medium'?'modéré':'faible'} à étudier.</strong> Score interne heuristique, pas une probabilité ni une recommandation.</p><ul>{grading.reasons.map(x=><li key={x}>{x}</li>)}</ul>{grading.hasRealGradedData?<p>Données gradées vérifiées disponibles.</p>:<p>Données de prix gradés vérifiées non disponibles.</p>}</section>}
 </section></div>,document.body)
}
