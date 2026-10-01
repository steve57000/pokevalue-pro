import {useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {ExternalLink,Heart,Minus,Plus,X} from 'lucide-react'
import type {SetCard} from '../api/sets'
import type {CollectionEntry} from '../domain/collection'
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
export const collectionValue=(entry?:Pick<CollectionEntry,'manualPrice'|'quantity'>,automaticPrice?:number)=>{const unit=entry?.manualPrice??automaticPrice;return entry&&unit!==undefined?unit*entry.quantity:undefined}
function Sparkline({points}:{points:{date:string;value:number}[]}){if(points.length<2)return <p className="history-building">Historique en cours de constitution</p>;const values=points.map(x=>x.value),min=Math.min(...values),span=Math.max(...values)-min||1,path=points.map((x,i)=>`${i?'L':'M'} ${i/(points.length-1)*100} ${36-(x.value-min)/span*32}`).join(' ');return <svg className="price-sparkline" viewBox="0 0 100 40" role="img" aria-label={`Évolution de ${money(points[0].value)} à ${money(points[points.length-1].value)}`}><path d={path}/></svg>}
export function CardDetailsModal({card,setName,language,entry,price,favorite,onFavorite,onQuantity,onEdit,onShowcase,onClose}:Props){
 const [tab,setTab]=useState<Tab>('overview'),dialogRef=useModalDialog(onClose)
 const history=useMemo(()=>getPriceHistory(card.id,language),[card.id,language]),cm=price?.cardmarket
 const grading=getGradingInterest({rawPrice:price?.price?.value,rarity:card.rarity,trend:cm?.trend,avg30:cm?.avg30,avg7:cm?.avg7,low:cm?.low})
 const value=collectionValue(entry,price?.price?.value),marketUrl=buildCardmarketUrl({...card,setName})
 const stat=(label:string,n?:number)=><div><span>{label}</span><strong>{n===undefined?'Indisponible':money(n)}</strong></div>
 return createPortal(<div className="details-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section ref={dialogRef} className="card-details" role="dialog" aria-modal="true" aria-labelledby="details-title" aria-describedby="details-description"><button className="details-close" onClick={onClose} aria-label="Fermer les détails"><X/></button>
  <div className="details-hero"><button className="details-image-button" onClick={onShowcase} disabled={!onShowcase} aria-label={`Voir ${card.name} en grand`}><CatalogueImage card={card} quality="high" requestedLanguage={language}/></button><div><span className="eyebrow">Fiche carte</span><h2 id="details-title">{card.name}</h2><p id="details-description">Nº {card.localId} · {setName}</p><p>Carte affichée : {languageName[language]??language} · rareté {card.rarity||'non renseignée'}</p>{grading.level!=='low'&&<span className="grading-badge" title="Potentiel à étudier — estimation basée sur prix, rareté et tendance">★ Potentiel gradation</span>}</div></div>
  <nav className="details-tabs" aria-label="Sections de la fiche">{([['overview','Aperçu'],['price','Prix'],['collection','Collection'],['grading','Gradation']] as const).map(([id,label])=><button key={id} aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  <div className="details-quick-actions"><button onClick={()=>onQuantity(Math.max(0,(entry?.quantity??0)-1))} disabled={!entry?.quantity} aria-label="Retirer un exemplaire"><Minus/></button><strong>×{entry?.quantity??0}</strong><button onClick={()=>onQuantity((entry?.quantity??0)+1)} aria-label="Ajouter un exemplaire"><Plus/></button><button onClick={onEdit}>Modifier</button>{onFavorite&&<button onClick={onFavorite}><Heart size={17} fill={favorite?'currentColor':'none'}/>{favorite?'Favori':'Ajouter aux favoris'}</button>}{onShowcase&&<button onClick={onShowcase}>Voir en grand</button>}<a href={marketUrl} target="_blank" rel="noopener noreferrer">Cardmarket <ExternalLink size={15}/></a></div>
  {tab==='overview'&&<section><h3>Aperçu</h3><p>Prix indicatif actuel : <strong>{price?.price?money(price.price.value):'indisponible'}</strong></p><p>La disponibilité du marché ne garantit pas un prix propre à la langue physique de la carte.</p></section>}
  {tab==='price'&&<section><h3>Prix</h3><div className="price-stat-grid">{stat('Prix marché',price?.price?.value)}{stat('Tendance',cm?.trend)}{stat('Moyenne 1 jour',cm?.avg1)}{stat('Moyenne 7 jours',cm?.avg7)}{stat('Moyenne 30 jours',cm?.avg30)}{stat('Plus bas',cm?.low)}</div><dl className="price-provenance"><div><dt>Source</dt><dd>{price?.price?'Cardmarket · marché disponible pour cette impression':'Non disponible'}</dd></div><div><dt>Devise</dt><dd>{price?.price?.currency??'—'}</dd></div><div><dt>Langue/édition</dt><dd>Carte affichée : {languageName[language]??language}</dd></div><div><dt>Dernière mise à jour</dt><dd>{price?.price?.updatedAt?new Date(price.price.updatedAt).toLocaleDateString('fr-FR'):'Non communiquée'}</dd></div></dl>{!['fr','en'].includes(language)&&<p>Prix spécifique à cette langue non disponible. Le prix ci-dessus est une référence marché disponible pour cette impression.</p>}{price?.tcgplayer?.market!==undefined&&<p>TCGPlayer : <strong>${price.tcgplayer.market.toFixed(2)}</strong> USD (source distincte, sans conversion ni addition aux euros).</p>}<div className="price-history"><h4>Historique PokéValue</h4><p>Prix observés par PokéValue depuis le premier suivi de cette carte</p><Sparkline points={history}/></div></section>}
  {tab==='collection'&&<section><h3>Collection</h3><p>{entry?.quantity??0} exemplaire{entry?.quantity===1?'':'s'} · valeur : <strong>{value===undefined?'indisponible':money(value)}</strong></p>{entry?.manualPrice!==undefined&&<p>Prix personnalisé utilisé : {money(entry.manualPrice)} par exemplaire.</p>}</section>}
  {tab==='grading'&&<section><h3>Gradation</h3><p><strong>Potentiel {grading.level==='high'?'élevé':grading.level==='medium'?'modéré':'faible'} à étudier.</strong> Score interne heuristique, pas une probabilité ni une recommandation.</p><ul>{grading.reasons.map(x=><li key={x}>{x}</li>)}</ul>{grading.hasRealGradedData?<p>Données gradées vérifiées disponibles.</p>:<p>Données de prix gradés vérifiées non disponibles.</p>}</section>}
 </section></div>,document.body)
}
