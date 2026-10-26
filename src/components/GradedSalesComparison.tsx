import {useMemo,useState,type FormEvent} from 'react'
import {ArrowUpRight,BarChart3,Plus,Trash2} from 'lucide-react'
import type {CollectionEntry} from '../domain/collection'
import {
 GRADING_SERVICES,calculateSaleStats,createGradedSale,ebaySoldSearch,gradeGroup,gradedPremiumNet,
 type GradedSale,type GradedSaleInput,type GradingCompany,
} from '../domain/gradedSales'
import {money} from '../utils/money'

type Props={
 entry:CollectionEntry
 rawPrice?:number
 sales:GradedSale[]
 onAdd:(item:GradedSale)=>void
 onRemove:(id:string)=>void
}
const groupOptions=['10','9.5','9','8','7'] as const
const defaultCompany:GradingCompany='PSA'

export function GradedSalesComparison({entry,rawPrice,sales,onAdd,onRemove}:Props){
 const [targetGrade,setTargetGrade]=useState<string>('10')
 const [period,setPeriod]=useState<90|365>(365)
 const [saleCompany,setSaleCompany]=useState<GradingCompany>(defaultCompany)
 const [saleGrade,setSaleGrade]=useState<string>('10')
 const [price,setPrice]=useState('')
 const [date,setDate]=useState(new Date().toISOString().slice(0,10))
 const [marketplace,setMarketplace]=useState('eBay')
 const [url,setUrl]=useState('')
 const [formVisible,setFormVisible]=useState(false)
 const [error,setError]=useState('')
 const [costs,setCosts]=useState<Partial<Record<GradingCompany,string>>>({})
 const [feePercent,setFeePercent]=useState<string>('')
 const [showTransactions,setShowTransactions]=useState(false)
 const comparable=useMemo(()=>GRADING_SERVICES.flatMap(company=>company.grades
  .filter(grade=>gradeGroup(grade)===targetGrade)
  .map(grade=>({company,grade,stats:calculateSaleStats(sales,entry.key,company.id,grade,period)}))),[sales,entry.key,targetGrade,period])
 const observed=comparable.filter(row=>row.stats)
 const own=sales.filter(row=>row.cardKey===entry.key).sort((a,b)=>b.soldAt.localeCompare(a.soldAt))
 const service=GRADING_SERVICES.find(item=>item.id===saleCompany)!
 const selectSale=(company:GradingCompany,grade:string)=>{
  setSaleCompany(company);setSaleGrade(grade);setFormVisible(true);setError('')
 }
 const submit=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault()
  const value=Number(price.replace(',','.'))
  if(!price.trim()||!Number.isFinite(value)||value<=0){setError('Saisis un prix de vente positif.');return}
  const input:GradedSaleInput={
   cardKey:entry.key,company:saleCompany,grade:saleGrade,priceEur:Math.round(value*100)/100,
   soldAt:date,marketplace:marketplace.trim(),sourceUrl:url.trim(),
  }
  try{
   onAdd(createGradedSale(input))
   setPrice('');setUrl('');setError('');setFormVisible(false)
  }catch(caught){setError(caught instanceof Error?caught.message:'Vente invalide.')}
 }
 return <div className="grading-comparison">
  <div className="grading-comparison-heading">
   <div><span className="eyebrow"><BarChart3 size={15}/> Marché secondaire</span><h4>Comparer les ventes gradées</h4>
    <p>Même carte, même impression ({entry.language.toUpperCase()} · {entry.variant}) et même note chez chaque société. Ventes documentées saisies localement, non vérifiées automatiquement.</p></div>
   <button type="button" className="grading-add-sale" onClick={()=>setFormVisible(open=>!open)}><Plus size={15}/> Ajouter une vente</button>
  </div>
  <div className="grading-comparison-controls">
   <label>Note recherchée<select value={targetGrade} onChange={event=>setTargetGrade(event.target.value)}>{groupOptions.map(grade=><option key={grade} value={grade}>{grade}</option>)}</select></label>
   <label>Ventes sur<select value={period} onChange={event=>setPeriod(Number(event.target.value) as 90|365)}><option value={90}>90 jours</option><option value={365}>12 mois</option></select></label>
   <label>Commission de vente (%)<input type="number" inputMode="decimal" min="0" max="100" step=".1" placeholder="À renseigner" value={feePercent} onChange={e=>setFeePercent(e.target.value)}/></label>
  </div>
  <div className="grading-table-scroll"><table className="grading-comparison-table">
   <thead><tr><th scope="col">Société / note</th><th scope="col">Ventes</th><th scope="col">Médiane</th><th scope="col">Fourchette</th><th scope="col">Dernière vente</th><th scope="col">Frais totaux (€)</th><th scope="col">Prime nette*</th><th scope="col">Sources</th></tr></thead>
   <tbody>{comparable.map(({company,grade,stats})=>{
    const typedCost=costs[company.id]
    const fullCost=typedCost!==undefined&&typedCost.trim()!==''?Number(typedCost):undefined
    const fee=feePercent.trim()!==''?Number(feePercent):undefined
    const premium=gradedPremiumNet(stats?.median,rawPrice,fullCost,fee)
    return <tr key={company.id+'-'+grade}>
     <th scope="row"><strong>{company.name}</strong><small>{grade}</small></th>
     <td>{stats?.count??'—'}{stats&&stats.count<3&&<small className="grading-low-sample">Peu de ventes</small>}</td>
     <td><strong>{stats?money(stats.median):'—'}</strong></td>
     <td>{stats?stats.min===stats.max?money(stats.min):money(stats.min)+' – '+money(stats.max):'—'}</td>
     <td>{stats?new Date(stats.latest+'T12:00:00').toLocaleDateString('fr-FR'):'—'}</td>
     <td><input aria-label={'Frais totaux '+company.name} type="number" inputMode="decimal" step=".01" min="0" placeholder="À saisir" value={typedCost??''} onChange={e=>setCosts(current=>({...current,[company.id]:e.target.value}))}/></td>
     <td>{premium===undefined?'—':<strong className={premium>=0?'grading-positive':'grading-negative'}>{premium>0?'+':''}{money(premium)}</strong>}</td>
     <td><a target="_blank" rel="noopener noreferrer" href={ebaySoldSearch(entry.name,entry.number,entry.setName,company.id,grade,entry.language)}>eBay vendus <ArrowUpRight size={13}/></a><button type="button" title="Saisir une vente documentée" onClick={()=>selectSale(company.id,grade)}>Ajouter</button></td>
    </tr>
   })}</tbody>
  </table></div>
  <p className="grading-comparison-footnote">*Prime nette vs vente brute = (médiane gradée − valeur brute) × (1 − commission) − frais totaux de gradation et d'envoi. À renseigner pour chaque société. Calcul indicatif : les frais, taxes et autres risques personnels ne sont pas tous connus.</p>
  {observed.length===0?<p className="grading-comparison-empty">Aucune vente enregistrée pour cette note et cette période. Les liens eBay ouvrent une recherche de ventes terminées ; vérifier chaque impression, langue, variante et transaction avant de saisir un prix. Aucun montant n’est extrapolé.</p>
   :<p className="grading-comparison-observed">{observed.length} combinaison{observed.length>1?'s':''} société / note avec données sur {period} jours · {own.length} vente{own.length>1?'s':''} enregistrée{own.length>1?'s':''} au total pour cette carte.</p>}
  {formVisible&&<form className="grading-sale-form" onSubmit={submit}>
   <h5>Documenter une vente conclue</h5><p>Ne pas enregistrer les annonces encore en vente. Les prix doivent être en euros, hors frais de port.</p>
   <div className="grading-sale-fields">
    <label>Société<select value={saleCompany} onChange={event=>{const next=event.target.value as GradingCompany;setSaleCompany(next);setSaleGrade(GRADING_SERVICES.find(item=>item.id===next)!.grades[0])}}>{GRADING_SERVICES.map(company=><option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
    <label>Note exacte<select value={saleGrade} onChange={event=>setSaleGrade(event.target.value)}>{service.grades.map(grade=><option key={grade} value={grade}>{grade}</option>)}</select></label>
    <label>Prix vendu (€)<input type="text" inputMode="decimal" placeholder="Ex. 145,00" required value={price} onChange={event=>setPrice(event.target.value)}/></label>
    <label>Date réelle<input type="date" required max={new Date().toISOString().slice(0,10)} value={date} onChange={event=>setDate(event.target.value)}/></label>
    <label>Plateforme<input type="text" maxLength={80} required value={marketplace} onChange={event=>setMarketplace(event.target.value)}/></label>
    <label className="grading-sale-url">Lien de preuve de vente<input type="url" placeholder="https://..." maxLength={1500} required value={url} onChange={event=>setUrl(event.target.value)}/></label>
   </div>
   {error&&<p role="alert" className="grading-sale-error">{error}</p>}
   <div className="grading-sale-actions"><button type="button" onClick={()=>setFormVisible(false)}>Annuler</button><button type="submit" className="grading-add-sale">Enregistrer cette vente</button></div>
  </form>}
  {own.length>0&&<div className="grading-sale-history">
   <button type="button" aria-expanded={showTransactions} onClick={()=>setShowTransactions(value=>!value)}>Historique local · {own.length} vente{own.length>1?'s':''} {showTransactions?'−':'+'}</button>
   {showTransactions&&<ul>{own.map(item=><li key={item.id}><span><b>{item.company} {item.grade}</b> · {money(item.priceEur)} · {item.soldAt} · {item.marketplace} · <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Preuve <ArrowUpRight size={12}/></a></span><button type="button" aria-label={'Supprimer la vente '+item.company+' '+item.soldAt} onClick={()=>onRemove(item.id)}><Trash2 size={15}/></button></li>)}</ul>}
  </div>}
 </div>
}
