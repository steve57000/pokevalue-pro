import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus, X } from 'lucide-react'
import type { SetCard } from '../api/sets'
import type { CardCondition, CollectionEntry } from '../domain/collection'

type Draft = { quantity: number; condition: CardCondition; manualPrice?: number; notes: string }
type Props = { card: SetCard; setName: string; entry?: CollectionEntry; automaticPrice?: { value: number; label: string; updatedAt?: string } | null; onSave: (draft: Draft) => void; onRemove: () => void; onClose: () => void }
export function CardEditor({card,setName,entry,automaticPrice,onSave,onRemove,onClose}: Props) {
  const [draft,setDraft] = useState<Draft>(()=>({quantity:entry?.quantity||1,condition:entry?.condition??'near-mint',manualPrice:entry?.manualPrice,notes:entry?.notes??''}))
  useEffect(()=>{
    const key = (event: KeyboardEvent) => {if(event.key==='Escape') onClose()}
    window.addEventListener('keydown',key)
    return ()=>window.removeEventListener('keydown',key)
  },[onClose])
  return createPortal(<div className="card-editor-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget) onClose()}}>
    <section className="card-editor-modal" role="dialog" aria-modal="true" aria-labelledby="card-editor-title">
      <button className="card-editor-close" onClick={onClose} aria-label="Fermer"><X size={19}/></button>
      <div className="card-editor-top"><span className="eyebrow">{entry?'Modifier ma carte':'Ajouter à ma collection'}</span><h2 id="card-editor-title">{card.name}</h2><p>{setName} · nº {card.localId} · français</p></div>
      <form onSubmit={event=>{event.preventDefault();onSave(draft)}}>
        <div className="card-editor-fields"><label>Quantité<div className="quantity-stepper"><button type="button" aria-label="Diminuer la quantité" disabled={draft.quantity<=1} onClick={()=>setDraft({...draft,quantity:Math.max(1,draft.quantity-1)})}><Minus size={17}/></button><input aria-label="Quantité" type="number" min="1" step="1" required value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Number(e.target.value)})}/><button type="button" aria-label="Augmenter la quantité" onClick={()=>setDraft({...draft,quantity:draft.quantity+1})}><Plus size={17}/></button></div></label>
          <label>État<select value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value as CardCondition})}><option value="mint">Mint</option><option value="near-mint">Near Mint</option><option value="excellent">Excellent</option><option value="good">Bon</option><option value="played">Jouée</option><option value="poor">Abîmée</option></select></label></div>
        <label>Prix personnalisé (€) <small>Facultatif</small><input type="number" min="0" step="0.01" placeholder="Utiliser le prix automatique" value={draft.manualPrice??''} onChange={e=>setDraft({...draft,manualPrice:e.target.value===''?undefined:Number(e.target.value)})}/></label>
        <div className="card-editor-price"><span>{automaticPrice?`Prix Cardmarket indicatif · ${automaticPrice.value.toFixed(2)} € · ${automaticPrice.label}${automaticPrice.updatedAt?` · ${new Date(automaticPrice.updatedAt).toLocaleDateString('fr-FR')}`:''}`:'Prix automatique non disponible pour cette carte.'}</span><strong>Valeur de mes exemplaires : {draft.manualPrice!==undefined||automaticPrice?`${((draft.manualPrice??automaticPrice!.value)*draft.quantity).toFixed(2)} €`:'indisponible'}</strong></div>
        <label>Notes<textarea rows={3} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="Ex. état des coins, provenance…"/></label>
        <div className="card-editor-actions">{entry&&<button type="button" className="remove" onClick={onRemove}>Retirer la carte</button>}<button type="button" onClick={onClose}>Annuler</button><button className="primary" type="submit" disabled={!Number.isInteger(draft.quantity)||draft.quantity<1||draft.manualPrice!==undefined&&(!Number.isFinite(draft.manualPrice)||draft.manualPrice<0)}>Valider ma carte</button></div>
      </form>
    </section>
  </div>,document.body)
}
