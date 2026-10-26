import {useState} from 'react'
import {ArrowUpRight,Search} from 'lucide-react'
import type {CollectionEntry} from '../domain/collection'
import {GRADING_SERVICES,gradeGroup,ebaySoldSearch,type GradingCompany} from '../domain/gradedSales'

const grades=['10','9.5','9','8.5','8','7.5','7','6','5','4','3','2','1']
/** These URLs point to the provider's own search results. They never imply a verified match. */
export function ebayGlobalSoldSearch(entry:Pick<CollectionEntry,'name'|'number'|'setName'|'language'>,company:GradingCompany,grade:string){
 const terms=[entry.name,entry.number,'pokemon',company,grade,entry.setName].filter(Boolean).join(' ')
 const params=new URLSearchParams({_nkw:terms,LH_Sold:'1',LH_Complete:'1',_sop:'13'})
 return 'https://www.ebay.com/sch/i.html?'+params.toString()
}
export function priceChartingSearch(entry:Pick<CollectionEntry,'name'|'number'|'setName'>){
 const params=new URLSearchParams({q:[entry.name,entry.number,entry.setName].filter(Boolean).join(' '),type:'prices'})
 return 'https://www.pricecharting.com/search-products?'+params.toString()
}
export function GradedSaleSources({entry}:{entry:CollectionEntry}){
 const [targetGrade,setTargetGrade]=useState('10')
 return <section className="graded-source-links" aria-label="Sources de ventes gradées terminées">
  <header className="graded-source-links-head"><div><h5><Search size={17}/> Rechercher des ventes conclues</h5><p>Recherche par carte, société et note. Une recherche peut contenir des variantes ou des résultats sans vente : vérifie toujours la langue et l'impression.</p></div>
   <label>Note<select value={targetGrade} onChange={event=>setTargetGrade(event.target.value)}>{grades.map(grade=><option key={grade}>{grade}</option>)}</select></label>
  </header>
  <div className="graded-source-grid">{GRADING_SERVICES.map(company=>{
   const matched=company.grades.filter(grade=>gradeGroup(grade)===targetGrade)
   return <article key={company.id}><h6>{company.name}</h6>
    {matched.length?matched.map(grade=><div className="graded-source-grade" key={grade}>
      <span>{grade}</span>
      <div><a href={ebaySoldSearch(entry.name,entry.number,entry.setName,company.id,grade,entry.language)} target="_blank" rel="noopener noreferrer">eBay France <ArrowUpRight size={13}/></a>
       <a href={ebayGlobalSoldSearch(entry,company.id,grade)} target="_blank" rel="noopener noreferrer">eBay monde <ArrowUpRight size={13}/></a></div>
     </div>):<small>Cette note n'est pas répertoriée pour cette société.</small>}
   </article>
  })}</div>
  <div className="graded-source-guide"><span><strong>Guide des prix et historique :</strong> PriceCharting propose des relevés gradés selon les cartes, surtout PSA/BGS. Lien vers une recherche générale : il ne présélectionne pas ta note et ne confirme pas la langue.</span>
   <a target="_blank" rel="noopener noreferrer" href={priceChartingSearch(entry)}>PriceCharting <ArrowUpRight size={14}/></a></div>
 </section>
}
