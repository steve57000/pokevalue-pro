import {useMemo,useState,type FormEvent} from 'react'
import {GradedSaleSources} from './GradedSaleSources'
import {ArrowUpRight,Plus,Trash2,Pencil} from 'lucide-react'
import type {CollectionEntry} from '../domain/collection'
import type {GradingSettings} from '../domain/collectionExtras'
import {GRADING_SERVICES,calculateSaleStats,createGradedSale,gradedPremiumNet,type GradedSale,type GradingCompany} from '../domain/gradedSales'
import {money} from '../utils/money'

type Props={entry:CollectionEntry;rawPrice?:number;sales:GradedSale[];onSave:(item:GradedSale)=>boolean;onRemove:(id:string)=>void;settings?:GradingSettings;onSettings:(settings:Omit<GradingSettings,'updatedAt'>)=>void}
export function GradedSalesComparison({entry,rawPrice,sales,onSave,onRemove,settings,onSettings}:Props){
 const [period,setPeriod]=useState<90|365>(365)
 const [saleCompany,setSaleCompany]=useState<GradingCompany>('PCA'),[saleGrade,setSaleGrade]=useState('10')
 const [price,setPrice]=useState(''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[marketplace,setMarketplace]=useState('eBay'),[url,setUrl]=useState('')
 const [formVisible,setFormVisible]=useState(false),[editingId,setEditingId]=useState<string>(),[error,setError]=useState('')
 const observations=useMemo(()=>sales.filter(row=>row.cardKey===entry.key).sort((a,b)=>b.soldAt.localeCompare(a.soldAt)),[sales,entry.key])
 const observed=useMemo(()=>GRADING_SERVICES.flatMap(company=>company.grades.map(grade=>({company,grade,stats:calculateSaleStats(sales,entry.key,company.id,grade,period)}))).filter(row=>row.stats),[sales,entry.key,period])
 const service=GRADING_SERVICES.find(item=>item.id===saleCompany)!
 const costs=settings?.costs??{},feePercent=settings?.feePercent??''
 const edit=(row?:GradedSale)=>{
  setEditingId(row?.id);setSaleCompany(row?.company??'PCA');setSaleGrade(row?.grade??'10');setPrice(row?String(row.priceEur):'');setDate(row?.soldAt??new Date().toISOString().slice(0,10));setMarketplace(row?.marketplace??'eBay');setUrl(row?.sourceUrl??'');setError('');setFormVisible(true)
 }
 const submit=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault()
  try{
   const value=Number(price.replace(',','.'))
   const item=createGradedSale({cardKey:entry.key,company:saleCompany,grade:saleGrade,priceEur:Math.round(value*100)/100,soldAt:date,marketplace:marketplace.trim(),sourceUrl:url.trim()})
   if(observations.some(row=>row.id!==editingId&&row.sourceUrl===item.sourceUrl&&row.company===item.company&&row.grade===item.grade))throw new Error('Ce relevé existe déjà.')
   if(!onSave({...item,id:editingId??item.id}))throw new Error('Le relevé n’a pas pu être enregistré.')
   setFormVisible(false);setError('')
  }catch(caught){setError(caught instanceof Error?caught.message:'Relevé invalide.')}
 }
 return <div className="grading-comparison">
  <div className="grading-comparison-heading"><div><h4>Ventes constatées sur le marché</h4><p>{entry.language.toUpperCase()} · {entry.variant} · {observations.length} relevé{observations.length>1?'s':''}</p></div><button type="button" className="grading-add-sale" onClick={()=>edit()}><Plus size={16}/> Ajouter un relevé</button></div>
  {formVisible&&<form className="grading-sale-form" onSubmit={submit}>
   <h5>{editingId?'Modifier le relevé':'Relever une vente constatée'}</h5><p>Vente conclue d’un autre vendeur, prix en euros hors port.</p>
   <div className="grading-sale-fields">
    <label>Société<select value={saleCompany} onChange={e=>{const next=e.target.value as GradingCompany;setSaleCompany(next);setSaleGrade(GRADING_SERVICES.find(s=>s.id===next)!.grades[0])}}>{GRADING_SERVICES.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
    <label>Note exacte<select value={saleGrade} onChange={e=>setSaleGrade(e.target.value)}>{service.grades.map(g=><option key={g}>{g}</option>)}</select></label>
    <label>Prix constaté (€)<input autoFocus type="text" inputMode="decimal" required value={price} onChange={e=>setPrice(e.target.value)}/></label>
    <label>Date de vente<input type="date" required max={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label>Plateforme<input maxLength={80} required value={marketplace} onChange={e=>setMarketplace(e.target.value)}/></label>
    <label className="grading-sale-url">Lien de l’annonce vendue<input type="url" maxLength={1500} required value={url} onChange={e=>setUrl(e.target.value)}/></label>
   </div>{error&&<p role="alert" className="grading-sale-error">{error}</p>}
   <div className="grading-sale-actions"><button type="button" onClick={()=>setFormVisible(false)}>Annuler</button><button type="submit" className="grading-add-sale">Enregistrer le relevé</button></div>
  </form>}
  <details className="compact-section" open><summary>Prix constatés <span>{observed.length} note{observed.length>1?'s':''} renseignée{observed.length>1?'s':''}</span></summary><div className="compact-section-body">
   <label className="period-select">Période<select value={period} onChange={e=>setPeriod(Number(e.target.value) as 90|365)}><option value={90}>90 jours</option><option value={365}>12 mois</option></select></label>
   {observed.length===0?<p className="grading-comparison-empty">Aucun relevé sur cette période.</p>:<div className="observed-grid">{observed.map(({company,grade,stats})=><article className="observed-price" key={company.id+grade}><header><b>{company.name} {grade}</b><strong>{money(stats!.median)}</strong></header><small>Médiane · {stats!.count} vente{stats!.count>1?'s':''}{stats!.count<3?' · échantillon réduit':''}</small><dl><div><dt>Fourchette</dt><dd>{money(stats!.min)} – {money(stats!.max)}</dd></div><div><dt>Dernière vente</dt><dd>{new Date(stats!.latest+'T12:00:00').toLocaleDateString('fr-FR')}</dd></div></dl></article>)}</div>}
  </div></details>
  <details className="compact-section"><summary>Annonces relevées <span>{observations.length}</span></summary><div className="compact-section-body"><ul className="observations-list">{observations.map(row=><li key={row.id}><div><b>{row.company} {row.grade} · {money(row.priceEur)}</b><small>{new Date(row.soldAt+'T12:00:00').toLocaleDateString('fr-FR')} · {row.marketplace}</small><a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">Voir l’annonce vendue <ArrowUpRight size={14}/></a></div><div className="observation-actions"><button type="button" aria-label={'Modifier le relevé '+row.priceEur+' euros'} onClick={()=>edit(row)}><Pencil size={16}/></button><button type="button" aria-label={'Supprimer le relevé '+row.priceEur+' euros'} onClick={()=>{if(window.confirm('Supprimer ce relevé de marché ?'))onRemove(row.id)}}><Trash2 size={16}/></button></div></li>)}</ul>{observations.length===0&&<p>Aucune annonce enregistrée.</p>}</div></details>
  <details className="compact-section"><summary>Rechercher des ventes <span>eBay · guides</span></summary><div className="compact-section-body"><GradedSaleSources entry={entry}/></div></details>
  <details className="compact-section"><summary>Frais et comparaison nette</summary><div className="compact-section-body">
   <div className="grading-sale-fields"><label>Commission (%)<input type="number" min="0" max="100" step=".1" placeholder="À renseigner" value={feePercent} onChange={e=>onSettings({cardKey:entry.key,costs,feePercent:e.target.value})}/></label>{GRADING_SERVICES.map(s=><label key={s.id}>Frais {s.name} (€)<input type="number" min="0" step=".01" placeholder="Gradation + envoi" value={costs[s.id]??''} onChange={e=>onSettings({cardKey:entry.key,feePercent,costs:{...costs,[s.id]:e.target.value}})}/></label>)}</div>
   {observed.map(({company,grade,stats})=>{const cost=costs[company.id],net=gradedPremiumNet(stats!.median,rawPrice,cost?.trim()?Number(cost):undefined,feePercent.trim()?Number(feePercent):undefined);return <p key={company.id+grade}>{company.name} {grade} : <strong>{net===undefined?'Frais à compléter':money(net)}</strong></p>})}
   <small className="grading-comparison-footnote">Écart net indicatif = (médiane gradée − prix brut) × (1 − commission) − frais. La note future n’est pas garantie.</small>
  </div></details>
 </div>
}
