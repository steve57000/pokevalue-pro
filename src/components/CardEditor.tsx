import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus, X } from 'lucide-react'
import type { SetCard } from '../api/sets'
import type { CardCondition, CollectionEntry } from '../domain/collection'
import {useModalDialog} from '../hooks/useModalDialog'

type Draft = { quantity: number; condition: CardCondition; manualPrice?: number; priceMode:'market'|'manual'; notes: string }
type Props = { card: SetCard; setName: string; language: string; entry?: CollectionEntry; automaticPrice?: { value: number; label: string; updatedAt?: string } | null; onSave: (draft: Draft) => void; onRemove: () => void; onClose: () => void }
export function CardEditor({card,setName,language,entry,automaticPrice,onSave,onRemove,onClose}: Props) {
  const [draft,setDraft] = useState<Draft>(()=>({quantity:entry?.quantity??1,condition:entry?.condition??'near-mint',manualPrice:entry?.manualPrice,priceMode:entry?.priceMode??(entry?.manualPrice!==undefined?'manual':'market'),notes:entry?.notes??''}))
  const languageLabel=({fr:'français',en:'anglais',ja:'japonais','zh-tw':'chinois traditionnel'} as Record<string,string>)[language]??language
  const dialogRef=useModalDialog(onClose)
  return createPortal(<div className="card-editor-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget) onClose()}}>
    <section ref={dialogRef} className="card-editor-modal" role="dialog" aria-modal="true" aria-labelledby="card-editor-title">
      <button className="card-editor-close" onClick={onClose} aria-label="Fermer"><X size={19}/></button>
      <div className="card-editor-top"><span className="eyebrow">{entry?'Modifier ma carte':'Ajouter à ma collection'}</span><h2 id="card-editor-title">{card.name}</h2><p>{setName} · nº {card.localId} · {languageLabel}</p></div>
      <form onSubmit={event=>{event.preventDefault();if(draft.quantity===0&&entry)onRemove();else onSave(draft)}}>
        <div className="card-editor-fields"><label>Quantité<div className="quantity-stepper"><button type="button" aria-label="Diminuer la quantité" disabled={draft.quantity<=(entry?0:1)} onClick={()=>setDraft({...draft,quantity:Math.max(entry?0:1,draft.quantity-1)})}><Minus size={17}/></button><input aria-label="Quantité" type="number" min={entry?0:1} step="1" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Math.max(entry?0:1,Number(e.target.value))})}/><button type="button" aria-label="Augmenter la quantité" onClick={()=>setDraft({...draft,quantity:draft.quantity+1})}><Plus size={17}/></button></div></label>
          <label>État<select value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value as CardCondition})}><option value="mint">Mint</option><option value="near-mint">Near Mint</option><option value="excellent">Excellent</option><option value="good">Bon</option><option value="played">Jouée</option><option value="poor">Abîmée</option></select></label></div>
        <fieldset className="price-choice"><legend>Prix utilisé pour ma collection</legend><label><input type="radio" name="price-mode" checked={draft.priceMode==='market'} onChange={()=>setDraft({...draft,priceMode:'market'})}/> Prix relevé par l’application {automaticPrice?`· ${automaticPrice.value.toFixed(2)} €`:'· indisponible'}</label><label><input type="radio" name="price-mode" checked={draft.priceMode==='manual'} onChange={()=>setDraft({...draft,priceMode:'manual'})}/> Mon prix personnalisé</label><input aria-label="Mon prix personnalisé en euros" type="number" min="0" step="0.01" placeholder="Saisir mon prix (€)" value={draft.manualPrice??''} onChange={e=>setDraft({...draft,priceMode:'manual',manualPrice:e.target.value===''?undefined:Number(e.target.value)})}/></fieldset>
        <div className="card-editor-price"><span>{automaticPrice?`Référence Cardmarket · ${automaticPrice.label}${automaticPrice.updatedAt?` · relevé du ${new Date(automaticPrice.updatedAt).toLocaleDateString('fr-FR')}`:''}`:'Prix automatique non disponible pour cette carte.'}{draft.manualPrice!==undefined?` · Ton prix enregistré : ${draft.manualPrice.toFixed(2)} €`:''}</span><strong>Valeur de mes exemplaires : {(draft.priceMode==='manual'?draft.manualPrice:automaticPrice?.value)!==undefined?`${(((draft.priceMode==='manual'?draft.manualPrice:automaticPrice?.value)??0)*draft.quantity).toFixed(2)} €`:'indisponible'}</strong></div>
        <label>Notes<textarea rows={3} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="Ex. état des coins, provenance…"/></label>
        <div className="card-editor-actions">{entry&&<button type="button" className="remove" onClick={onRemove}>Retirer la carte de ma collection</button>}<button type="button" onClick={onClose}>Annuler</button><button className="primary" type="submit" disabled={!Number.isInteger(draft.quantity)||draft.quantity<0||draft.manualPrice!==undefined&&(!Number.isFinite(draft.manualPrice)||draft.manualPrice<0)||draft.priceMode==='manual'&&draft.quantity>0&&draft.manualPrice===undefined}>{draft.quantity===0?'Retirer la carte':'Valider ma carte'}</button></div>
      </form>
    </section>
  </div>,document.body)
}
