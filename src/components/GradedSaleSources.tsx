import {useState} from 'react'
import {ArrowUpRight,Search} from 'lucide-react'
import type {CollectionEntry} from '../domain/collection'
import {GRADING_SERVICES,ebaySoldSearch,type GradingCompany} from '../domain/gradedSales'

/** These URLs point to the provider's own search results. They never imply a verified match. */
export function ebayGlobalSoldSearch(entry:Pick<CollectionEntry,'name'|'number'|'setName'|'language'>,company:GradingCompany,grade:string){
 const terms=[entry.name,entry.number,'pokemon',company,grade,entry.setName,entry.language.toUpperCase()].filter(Boolean).join(' ')
 const params=new URLSearchParams({_nkw:terms,LH_Sold:'1',LH_Complete:'1',_sop:'13'})
 return 'https://www.ebay.com/sch/i.html?'+params.toString()
}
export function priceChartingSearch(entry:Pick<CollectionEntry,'name'|'number'|'setName'>){
 const params=new URLSearchParams({q:[entry.name,entry.number,entry.setName].filter(Boolean).join(' '),type:'prices'})
 return 'https://www.pricecharting.com/search-products?'+params.toString()
}
export function GradedSaleSources({entry}:{entry:CollectionEntry}){
 const [company,setCompany]=useState<GradingCompany>('PCA')
 const [grade,setGrade]=useState('10')
 const service=GRADING_SERVICES.find(item=>item.id===company)!
 return <div className="graded-source-links">
  <div className="grading-sale-fields source-selectors">
   <label>Société<select value={company} onChange={event=>{const next=event.target.value as GradingCompany;setCompany(next);setGrade(GRADING_SERVICES.find(s=>s.id===next)!.grades[0])}}>{GRADING_SERVICES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>Note exacte<select value={grade} onChange={event=>setGrade(event.target.value)}>{service.grades.map(g=><option key={g}>{g}</option>)}</select></label>
  </div>
  <div className="source-actions" aria-label={'Recherches '+company+' '+grade}>
   <a href={ebaySoldSearch(entry.name,entry.number,entry.setName,company,grade,entry.language)} target="_blank" rel="noopener noreferrer"><Search size={16}/> eBay France <ArrowUpRight size={14}/></a>
   <a href={ebayGlobalSoldSearch(entry,company,grade)} target="_blank" rel="noopener noreferrer">eBay monde <ArrowUpRight size={14}/></a>
   <a href={priceChartingSearch(entry)} target="_blank" rel="noopener noreferrer">PriceCharting <ArrowUpRight size={14}/></a>
  </div>
  <small className="grading-comparison-footnote">eBay : {company} {grade} · {entry.language.toUpperCase()}. Vérifie les résultats. PriceCharting : guide général, sans filtre de note.</small>
 </div>
}
