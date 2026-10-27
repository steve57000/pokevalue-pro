import {useMemo,useState,type FormEvent} from 'react'
import {ArrowUpRight,Plus,Tag,Trash2,Pencil} from 'lucide-react'
import type {CollectionDocument,CollectionEntry} from '../domain/collection'
import {addPersonalSales,availableQuantity,changeListedFormat,completePersonalSale,removePersonalSale,updatePersonalSale,type PersonalSale} from '../domain/collectionExtras'
import {GRADING_SERVICES,type GradingCompany} from '../domain/gradedSales'
import type {GitHubCollectionSync} from '../hooks/useGitHubCollectionSync'
import {CatalogueImage} from './CatalogueImage'
import {money} from '../utils/money'
import './grading.css'

type Selection={cardKey:string;copyId?:string;quantity:number}
export function SalesPage({document,onChange,sync}:{document:CollectionDocument;onChange:(doc:CollectionDocument)=>void;sync:GitHubCollectionSync}){
 const [tab,setTab]=useState<'listed'|'sold'>('listed'),[adding,setAdding]=useState(false),[query,setQuery]=useState(''),[limit,setLimit]=useState(24)
 const [selected,setSelected]=useState<Record<string,Selection>>({}),[editing,setEditing]=useState<string>(),[error,setError]=useState('')
 const all=(document.personalSales??[]).filter(row=>!row.deletedAt),rows=all.filter(row=>row.status===tab).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
 const selectable=useMemo(()=>document.entries.filter(e=>e.quantity>0&&`${e.name} ${e.setName} ${e.number??''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())),[document.entries,query])
 const run=(operation:()=>CollectionDocument)=>{try{onChange(operation());setError('');return true}catch(err){setError((err as Error).message);return false}}
 const choose=(entry:CollectionEntry,copyId?:string)=>{
  const key=entry.key+'|'+(copyId??'raw')
  return <label className="sale-pick" key={key}><input type="checkbox" checked={Boolean(selected[key])} onChange={e=>setSelected(current=>{const next={...current};if(e.target.checked)next[key]={cardKey:entry.key,copyId,quantity:1};else delete next[key];return next})}/><span>{copyId?(()=>{const copy=entry.gradedCopies!.find(c=>c.id===copyId)!;return `${copy.company} ${copy.grade}${copy.certificate?' · '+copy.certificate:''}`})():'Brute'} · {availableQuantity(document,entry,copyId)} disponible(s)</span>{selected[key]&&!copyId&&<input aria-label={'Quantité à vendre de '+entry.name} type="number" min="1" max={availableQuantity(document,entry)} value={selected[key].quantity} onChange={e=>setSelected(current=>({...current,[key]:{...current[key],quantity:Number(e.target.value)}}))}/>}</label>
 }
 return <section className="sales-page grading-page"><header className="grading-heading"><span className="eyebrow"><Tag size={16}/> Ma collection</span><h1>Mes ventes</h1><p>Prépare tes cartes à vendre, brutes ou gradées.</p><small className="sales-sync" role="status">{sync.status==='saved'?'Synchronisé avec GitHub':sync.status==='pending'?'Sauvegarde en cours…':sync.status==='error'||sync.status==='conflict'?'Sauvegarde à vérifier dans le menu Sauvegarde':'Enregistré sur cet appareil'}</small></header>
  <div className="sales-toolbar"><div className="grading-filters" aria-label="État des ventes">{(['listed','sold'] as const).map(value=><button type="button" key={value} className={tab===value?'active':''} aria-pressed={tab===value} onClick={()=>{setTab(value);setEditing(undefined)}}>{value==='listed'?'À vendre':'Vendues'} · {all.filter(s=>s.status===value).length}</button>)}</div><button className="grading-add-sale" type="button" onClick={()=>setAdding(open=>!open)}><Plus size={16}/> Choisir mes cartes</button></div>
  {error&&<p className="grading-sale-error" role="alert">{error}</p>}
  {adding&&<section className="sale-picker"><header><h2>Ajouter des cartes à vendre</h2><button type="button" onClick={()=>{setAdding(false);setSelected({})}}>Fermer</button></header><label className="grading-search"><input aria-label="Rechercher dans mes cartes" placeholder="Nom, série ou numéro" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24)}}/></label>
   <p>Sélectionne un ou plusieurs exemplaires de ta collection.</p><div className="sale-picker-list">{selectable.slice(0,limit).map(entry=><article key={entry.key}><b>{entry.name}</b><small>{entry.setName} · Nº {entry.number} · {entry.language.toUpperCase()}</small>{availableQuantity(document,entry)>0&&choose(entry)}{entry.gradedCopies?.filter(copy=>availableQuantity(document,entry,copy.id)>0).map(copy=>choose(entry,copy.id))}{availableQuantity(document,entry)===0&&!entry.gradedCopies?.some(copy=>availableQuantity(document,entry,copy.id)>0)&&<small>Tous les exemplaires sont déjà à vendre.</small>}</article>)}</div>
   {selectable.length===0&&<p>Aucune carte possédée trouvée.</p>}{selectable.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+24)}>Afficher plus de cartes</button>}
   <div className="sale-picker-footer"><span>{Object.values(selected).reduce((n,s)=>n+s.quantity,0)} exemplaire(s) sélectionné(s)</span><button className="grading-add-sale" type="button" disabled={!Object.keys(selected).length} onClick={()=>{if(run(()=>addPersonalSales(document,Object.values(selected)))){setSelected({});setAdding(false);setTab('listed')}}}>Ajouter à vendre</button></div>
  </section>}
  {rows.length===0&&!adding&&<div className="grading-empty"><Tag size={25}/><h3>{tab==='listed'?'Aucune carte à vendre':'Aucune vente enregistrée'}</h3><p>{tab==='listed'?'Choisis des cartes dans ta collection pour préparer tes ventes.':'Les ventes conclues apparaîtront ici.'}</p></div>}
  <div className="personal-sales-list">{rows.map(sale=><article className="personal-sale" key={sale.id}>
   <div className="personal-sale-heading"><div className="personal-sale-image"><CatalogueImage card={{id:sale.card.cardId,name:sale.card.name,localId:sale.card.number??'',image:sale.card.image}} requestedLanguage={sale.card.language} quality="low"/></div><div><small>{sale.card.setName} · Nº {sale.card.number} · {sale.card.language.toUpperCase()}</small><h2>{sale.card.name}</h2><span className="holding-badge">{sale.copyId?`${sale.company} ${sale.grade}`:'Brute'} · ×{sale.quantity}</span><p>{sale.priceEur===undefined?'Prix à renseigner':`${money(sale.priceEur)} / carte`}{sale.status==='sold'&&sale.soldAt?' · '+new Date(sale.soldAt+'T12:00:00').toLocaleDateString('fr-FR'):''}</p>{sale.url&&<a href={sale.url} target="_blank" rel="noopener noreferrer">Mon annonce <ArrowUpRight size={14}/></a>}</div></div>
   <div className="personal-sale-actions"><button type="button" aria-expanded={editing===sale.id} onClick={()=>setEditing(current=>current===sale.id?undefined:sale.id)}><Pencil size={16}/>{editing===sale.id?'Fermer':'Modifier'}</button><button type="button" onClick={()=>{if(window.confirm(sale.status==='sold'?'Supprimer cet enregistrement ? Le stock ne sera pas rétabli.':'Retirer cette carte des ventes ? Elle restera dans ta collection.'))run(()=>removePersonalSale(document,sale.id))}}><Trash2 size={16}/>{sale.status==='sold'?'Supprimer':'Retirer des ventes'}</button></div>
   {editing===sale.id&&<PersonalSaleEditor key={sale.id+sale.updatedAt} sale={sale} document={document} onSave={next=>{onChange(next);setEditing(undefined)}}/>}
  </article>)}</div>
 </section>
}
function PersonalSaleEditor({sale,document,onSave}:{sale:PersonalSale;document:CollectionDocument;onSave:(doc:CollectionDocument)=>void}){
 const [price,setPrice]=useState(sale.priceEur===undefined?'':String(sale.priceEur)),[quantity,setQuantity]=useState(sale.quantity),[url,setUrl]=useState(sale.url),[notes,setNotes]=useState(sale.notes),[date,setDate]=useState(sale.soldAt??new Date().toISOString().slice(0,10))
 const [kind,setKind]=useState(sale.copyId?'graded':'raw'),[company,setCompany]=useState<GradingCompany>(sale.company??'PCA'),[grade,setGrade]=useState(sale.grade??'10'),[error,setError]=useState('')
 const [certificate,setCertificate]=useState(document.entries.find(e=>e.key===sale.cardKey)?.gradedCopies?.find(c=>c.id===sale.copyId)?.certificate??sale.certificate??'')
 const submit=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault()
  try{
   const sold=(event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='sold'
   const value=price.trim()===''?undefined:Number(price.replace(',','.'))
   if(sold&&value===undefined)throw new Error('Renseigne le prix de vente réel avant de conclure la vente.')
   let next=updatePersonalSale(document,{...sale,quantity,priceEur:value,url:url.trim(),notes,...(sale.status==='sold'?{soldAt:date}:{})})
   if(sale.status==='listed')next=changeListedFormat(next,sale.id,kind==='graded'?{company,grade,certificate}:undefined)
   if(sold)next=completePersonalSale(next,sale.id,value!,date)
   onSave(next)
  }catch(err){setError((err as Error).message)}
 }
 return <form className="grading-sale-form" onSubmit={submit}><div className="grading-sale-fields">
  {sale.status==='listed'&&<><label>Exemplaire<select value={kind} onChange={e=>setKind(e.target.value)}><option value="raw">Brut</option><option value="graded">Gradé</option></select></label>{kind==='graded'&&<><label>Société<select value={company} onChange={e=>{const value=e.target.value as GradingCompany;setCompany(value);setGrade(GRADING_SERVICES.find(s=>s.id===value)!.grades[0])}}>{GRADING_SERVICES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Note<select value={grade} onChange={e=>setGrade(e.target.value)}>{GRADING_SERVICES.find(s=>s.id===company)!.grades.map(g=><option key={g}>{g}</option>)}</select></label><label>Certification<input value={certificate} maxLength={100} onChange={e=>setCertificate(e.target.value)}/></label></>}</>}
  <label>Quantité<input type="number" min="1" step="1" disabled={sale.status==='sold'} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
  <label>Prix unitaire (€)<input type="text" inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)}/></label>
  <label>Date de vente<input type="date" value={date} max={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></label>
  <label className="grading-sale-url">Lien de mon annonce<input type="url" value={url} onChange={e=>setUrl(e.target.value)}/></label>
  <label className="grading-sale-url">Notes<textarea value={notes} rows={2} onChange={e=>setNotes(e.target.value)}/></label>
 </div>{sale.status==='listed'&&<p>Le statut brut / gradé met aussi à jour cet exemplaire dans ta collection. Marquer vendue retire la quantité du stock.</p>}{error&&<p role="alert" className="grading-sale-error">{error}</p>}<div className="grading-sale-actions"><button type="submit" value="save">Enregistrer</button>{sale.status==='listed'&&<button type="submit" value="sold" className="grading-add-sale">Marquer vendue</button>}</div></form>
}
