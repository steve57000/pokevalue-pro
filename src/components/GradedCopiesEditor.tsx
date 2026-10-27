import {GRADING_SERVICES,type GradingCompany} from '../domain/gradedSales'
import {newId,type GradedCopy} from '../domain/collectionExtras'
export function GradedCopiesEditor({quantity,copies,onChange}:{quantity:number;copies:GradedCopy[];onChange:(copies:GradedCopy[])=>void}){
 const update=(id:string,patch:Partial<GradedCopy>)=>onChange(copies.map(copy=>copy.id===id?{...copy,...patch}:copy))
 return <fieldset className="owned-copies"><legend>Mes exemplaires · {Math.max(0,quantity-copies.length)} brut(s) · {copies.length} gradé(s)</legend>
  {copies.map((copy,index)=><details className="compact-section" key={copy.id}><summary>Exemplaire {index+1} · {copy.company} {copy.grade}</summary><div className="compact-section-body grading-sale-fields">
   <label>Société<select value={copy.company} onChange={e=>{const company=e.target.value as GradingCompany;update(copy.id,{company,grade:GRADING_SERVICES.find(s=>s.id===company)!.grades[0]})}}>{GRADING_SERVICES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>Note<select value={copy.grade} onChange={e=>update(copy.id,{grade:e.target.value})}>{GRADING_SERVICES.find(s=>s.id===copy.company)!.grades.map(g=><option key={g}>{g}</option>)}</select></label>
   <label>Certification (facultatif)<input value={copy.certificate} maxLength={100} onChange={e=>update(copy.id,{certificate:e.target.value})}/></label>
   <button type="button" onClick={()=>onChange(copies.filter(c=>c.id!==copy.id))}>Repasser en brut</button>
  </div></details>)}
  <button type="button" disabled={quantity<=copies.length} onClick={()=>onChange([...copies,{id:newId(),company:'PCA',grade:'10',certificate:''}])}>Marquer un exemplaire comme gradé</button>
 </fieldset>
}
