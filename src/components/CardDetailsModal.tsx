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

type Tab='overview'|'price'|'collection'|'grading'
type Props={card:SetCard;setName:string;language:string;entry?:CollectionEntry;price?:CardPriceState;favorite?:boolean;onFavorite?:()=>void;onQuantity:(quantity:number)=>void;onEdit:()=>void;onShowcase?:()=>void;onClose:()=>void}
const languageName:Record<string,string>={fr:'français',en:'anglais',ja:'japonais','zh-tw':'chinois traditionnel'}
export const collectionValue=(entry?:Pick<CollectionEntry,'manualPrice'|'priceMode'|'quantity'>,automaticPrice?:number)=>{if(!entry)return undefined;const unit=collectionUnitPrice(entry,automaticPrice);return unit===undefined?undefined:unit*entry.quantity}
function Sparkline({points}:{points:{date:string;value:number}[]}){if(points.length<2)return <p className="history-building">L’historique se construit au fil des relevés quotidiens de l’application.</p>;const values=points.map(x=>x.value),min=Math.min(...values),max=Math.max(...values),span=max-min||1,coords=points.map((x,i)=>({x:18+i/(points.length-1)*284,y:116-(x.value-min)/span*94})),path=coords.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');return <><div className="history-chart-summary"><strong>{money(points[points.length-1].value)}</strong><span>{new Date(points[0].date).toLocaleDateString('fr-FR')} — {new Date(points[points.length-1].date).toLocaleDateString('fr-FR')}</span><small>Min. {money(min)} · Max. {money(max)}</small></div><svg className="price-sparkline" viewBox="0 0 320 142" role="img" aria-label={`Évolution du prix de ${money(points[0].value)} à ${money(points[points.length-1].value)}`}><path className="chart-grid" d="M18 22H302M18 69H302M18 116H302"/><path className="chart-area" d={`${path} L302 130 L18 130 Z`}/><path className="chart-line" d={path}/>{coords.map((p,i)=><circle key={`${points[i].date}-${i}`} cx={p.x} cy={p.y} r={i===coords.length-1?3.5:2}/>)}</svg></>}
export function CardDetailsModal({card,setName,language,entry,price,favorite,onFavorite,onQuantity,onEdit,onShowcase,onClose}:Props){
 const [tab,setTab]=useState<Tab>('overview'),dialogRef=useModalDialog(onClose)
 const history=useMemo(()=>getPriceHistory(card.id,language),[card.id,language]),cm=price?.cardmarket
 const grading=getGradingInterest({rawPrice:price?.price?.value,rarity:card.rarity,trend:cm?.trend,avg30:cm?.avg30,avg7:cm?.avg7,low:cm?.low})
 const value=collectionValue(entry,price?.price?.value),marketUrl=buildCardmarketUrl({...card,setName})
 const stat=(label:string,n?:number)=><div><span>{label}</span><strong>{n===undefined?'Indisponible':money(n)}</strong></div>
 return createPortal(<div className="details-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section ref={dialogRef} className="card-details" role="dialog" aria-modal="true" aria-labelledby="details-title" aria-describedby="details-description"><button className="details-close" onClick={onClose} aria-label="Fermer les détails"><X/></button>
  <div className="details-hero"><button className="details-image-button" onClick={onShowcase} disabled={!onShowcase} aria-label={`Voir ${card.name} en grand`}><CatalogueImage card={card} quality="high" requestedLanguage={language}/></button><div><span className="eyebrow">Fiche carte</span><h2 id="details-title">{card.name}</h2><p id="details-description">Nº {card.localId} · {setName}</p><p>Carte affichée : {languageName[language]??language} · rareté {card.rarity||'non renseignée'}</p>{grading.level!=='low'&&<span className="grading-badge" title="Potentiel à étudier — estimation basée sur prix, rareté et tendance">★ Potentiel gradation</span>}</div></div>
  <nav className="details-tabs" aria-label="Sections de la fiche">{([['overview','Aperçu'],['price','Prix'],['collection','Collection'],['grading','Gradation']] as const).map(([id,label])=><button key={id} aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  <div className="details-quick-actions" aria-label="Actions de la carte">
   <div className="details-quantity" aria-label={`Quantité possédée : ${entry?.quantity??0}`}><button onClick={()=>onQuantity(Math.max(0,(entry?.quantity??0)-1))} disabled={!entry?.quantity} aria-label="Retirer un exemplaire"><Minus/></button><strong>×{entry?.quantity??0}</strong><button onClick={()=>onQuantity((entry?.quantity??0)+1)} aria-label="Ajouter un exemplaire"><Plus/></button></div>
   <button className="details-action" onClick={onEdit}><span>Modifier</span></button>
   {onFavorite&&<button className="details-action" onClick={onFavorite}><Heart size={17} fill={favorite?'currentColor':'none'}/><span>{favorite?'Favori':'Favoris'}</span></button>}
   {onShowcase&&<button className="details-action" onClick={onShowcase}><span>Voir en grand</span></button>}
   <a className="details-action" href={marketUrl} target="_blank" rel="noopener noreferrer"><span>Cardmarket</span><ExternalLink size={15}/></a>
  </div>
  {tab==='overview'&&<section><h3>Aperçu</h3><p>Référence Cardmarket (langue non filtrée) : <strong>{price?.price?money(price.price.value):'indisponible'}</strong></p><p>TCGdex ne fournit pas ici de filtre par langue : ce montant peut provenir d’une autre langue et ne doit pas être interprété comme le prix français.</p></section>}
  {tab==='price'&&<section><h3>Prix</h3><div className="price-stat-grid">{stat('Prix bas (langue non filtrée)',price?.price?.value)}{stat('Tendance',cm?.trend)}{stat('Moyenne 1 jour',cm?.avg1)}{stat('Moyenne 7 jours',cm?.avg7)}{stat('Moyenne 30 jours',cm?.avg30)}{stat('Plus bas',cm?.low)}</div><dl className="price-provenance"><div><dt>Source</dt><dd>{price?.price?'Cardmarket via TCGdex · langue non filtrée':'Non disponible'}</dd></div><div><dt>Devise</dt><dd>{price?.price?.currency??'—'}</dd></div><div><dt>Langue/édition</dt><dd>Carte affichée : {languageName[language]??language}</dd></div><div><dt>Dernière mise à jour</dt><dd>{price?.price?.updatedAt?new Date(price.price.updatedAt).toLocaleDateString('fr-FR'):'Non communiquée'}</dd></div></dl>{!['fr','en'].includes(language)&&<p>Prix filtré par langue indisponible. Le montant ci-dessus est une référence Cardmarket non filtrée par langue, pas un prix vérifié pour cette carte dans sa langue.</p>}{price?.tcgplayer?.market!==undefined&&<p>TCGPlayer : <strong>${price.tcgplayer.market.toFixed(2)}</strong> USD (source distincte, sans conversion ni addition aux euros).</p>}<div className="price-history"><h4>Historique PokéValue</h4><p>Historique de la référence Cardmarket non filtrée par langue, observée par PokéValue.</p><Sparkline points={history}/></div></section>}
  {tab==='collection'&&<section><h3>Collection</h3><p>{entry?.quantity??0} exemplaire{entry?.quantity===1?'':'s'} · valeur : <strong>{value===undefined?'indisponible':money(value)}</strong></p>{entry?.manualPrice!==undefined&&<p>Prix personnalisé utilisé : {money(entry.manualPrice)} par exemplaire.</p>}</section>}
  {tab==='grading'&&<section><h3>Gradation</h3><p><strong>Potentiel {grading.level==='high'?'élevé':grading.level==='medium'?'modéré':'faible'} à étudier.</strong> Score interne heuristique, pas une probabilité ni une recommandation.</p><ul>{grading.reasons.map(x=><li key={x}>{x}</li>)}</ul>{grading.hasRealGradedData?<p>Données gradées vérifiées disponibles.</p>:<p>Données de prix gradés vérifiées non disponibles.</p>}</section>}
 </section></div>,document.body)
}
