import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus, X } from 'lucide-react'
import type { SetCard } from '../api/sets'
import type { CollectionEntry } from '../domain/collection'
import { getGradingInterest } from '../domain/grading'
import type { CardPriceState } from '../hooks/useCardPrices'
import { CatalogueImage } from './CatalogueImage'
import { money } from '../utils/money'

type Props={card:SetCard;setName:string;language:string;entry?:CollectionEntry;price?:CardPriceState;onQuantity:(quantity:number)=>void;onEdit:()=>void;onClose:()=>void}
const languageName:Record<string,string>={fr:'Français',en:'Anglais',ja:'Japonais','zh-tw':'Chinois traditionnel','zh-cn':'Chinois simplifié'}
export function CardDetailsModal({card,setName,language,entry,price,onQuantity,onEdit,onClose}:Props){
 const closeRef=useRef<HTMLButtonElement>(null)
 useEffect(()=>{const y=window.scrollY,previous=document.body.style.overflow,trigger=document.activeElement as HTMLElement|null;document.body.style.overflow='hidden';closeRef.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};addEventListener('keydown',key);return()=>{document.body.style.overflow=previous;scrollTo(0,y);trigger?.focus();removeEventListener('keydown',key)}},[onClose])
 const cm=price?.cardmarket,grading=getGradingInterest({rawPrice:price?.price?.value,trend:cm?.trend,avg30:cm?.avg30})
 const stat=(label:string,value?:number)=><div><span>{label}</span><strong>{value===undefined?'Indisponible':money(value)}</strong></div>
 return createPortal(<div className="details-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="card-details" role="dialog" aria-modal="true" aria-labelledby="details-title"><button ref={closeRef} className="details-close" onClick={onClose} aria-label="Fermer les détails"><X/></button>
  <div className="details-hero"><CatalogueImage card={card} quality="high" requestedLanguage={language}/><div><span className="eyebrow">Aperçu</span><h2 id="details-title">{card.name}</h2><p>Nº {card.localId} · {setName}</p><p>{languageName[language]??language.toUpperCase()} · rareté {('rarity' in card&&card.rarity)||'non renseignée'}</p>{grading.level!=='low'&&<span className="grading-badge">★ Potentiel à étudier</span>}</div></div>
  <section><h3>Prix brut</h3><div className="price-stat-grid">{stat('Prix marché',price?.price?.value)}{stat('Tendance',cm?.trend)}{stat('Moyenne 1 jour',cm?.avg1)}{stat('Moyenne 7 jours',cm?.avg7)}{stat('Moyenne 30 jours',cm?.avg30)}{stat('Plus bas observé',cm?.low)}</div><p className="source-note">{price?.price?`Cardmarket · ${language.toUpperCase()} · ${price.price.label}${price.price.updatedAt?` · mise à jour ${new Date(price.price.updatedAt).toLocaleDateString('fr-FR')}`:''}`:'Aucun prix Cardmarket disponible pour cette langue.'}</p>{price?.tcgplayer?.market!==undefined&&<p>TCGPlayer · EN · prix marché : <strong>${price.tcgplayer.market.toFixed(2)}</strong> (USD, sans conversion)</p>}</section>
  <section><h3>Collection</h3><div className="details-collection"><button disabled={!entry||entry.quantity<=1} onClick={()=>entry&&onQuantity(entry.quantity-1)} aria-label={`Retirer un exemplaire de ${card.name}`}><Minus/></button><strong>{entry?.quantity??0} exemplaire{entry?.quantity===1?'':'s'}</strong><button onClick={()=>onQuantity((entry?.quantity??0)+1)} aria-label={`Ajouter un exemplaire de ${card.name}`}><Plus/></button><span>Valeur : {price?.price&&entry?money((entry.manualPrice??price.price.value)*entry.quantity):'indisponible'}</span><button onClick={onEdit}>Modifier</button></div></section>
  <section><h3>Gradation</h3><p><strong>Potentiel {grading.level==='high'?'élevé':grading.level==='medium'?'modéré':'faible'} à étudier.</strong> Indicateur heuristique, pas une recommandation.</p><ul>{grading.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul><p>Prix gradés non disponibles avec les sources gratuites actuelles. Aucun prix PSA, BGS ou CGC n’est estimé.</p></section>
 </section></div>,document.body)
}
