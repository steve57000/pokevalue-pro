/** Observations de ventes conclues, déclarées et sourcées par le collectionneur.
 * Aucune ligne ne doit être interprétée comme une cote fournie automatiquement. */
export const GRADING_SERVICES = [
  {id:'PSA', name:'PSA', url:'https://www.psacard.com/gradingstandards', grades:['10','9','8','7','6','5','4','3','2','1']},
  {id:'PCA', name:'PCA', url:'https://pcagrade.com/fr/ressources', grades:['10+','10','9.5','9','8','7','6','5','4','3','2','1']},
  {id:'CCC', name:'CCC Grading', url:'https://www.cccgrading.com/fr/echelle-notation', grades:['10 Black Label','10 Gold Label','10 Neuf+','9.5','9','8.5','8','7','6','5','4','3','2','1']},
  {id:'CollectAura', name:'CollectAura', url:'https://www.collectaura.com/pages/grading-scale', grades:['10 Perfect','10 Gem Mint','9.5','9','8','7','6','5','4','3','2','1']},
  {id:'BGS', name:'BGS / Beckett', url:'https://www.beckett.com/grading/scale', grades:['10 Black Label','10','9.5','9','8.5','8','7.5','7','6.5','6','5.5','5','4.5','4','3.5','3','2.5','2','1.5','1']},
  {id:'CGC', name:'CGC', url:'https://www.cgccards.com/card-grading/grading-scale/', grades:['10 Pristine','10 Gem Mint','9.5','9','8.5','8','7.5','7','6.5','6','5.5','5','4.5','4','3.5','3','2.5','2','1.5','1']},
] as const
export type GradingCompany = typeof GRADING_SERVICES[number]['id']
export type GradedSale = {
  id:string
  cardKey:string // Identité d'impression : extension, langue, variante et carte
  company:GradingCompany
  grade:string
  priceEur:number
  soldAt:string // Date de vente effective, AAAA-MM-JJ
  sourceUrl:string // URL de l'annonce conclue / preuve de transaction
  marketplace:string
}
export type GradedSaleInput = Omit<GradedSale,'id'>
export const GRADED_SALES_STORAGE_KEY='pv-graded-sales-v1'
const MAX_SALES=2000
const datePattern=/^\d{4}-\d{2}-\d{2}$/
const validDate=(date:string)=>datePattern.test(date) && !Number.isNaN(Date.parse(date+'T00:00:00Z')) && new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date
export function gradeGroup(grade:string):string{return grade.match(/^(\d+(?:\.\d+)?)/)?.[1]??grade}
export function validGradedSale(value:unknown):value is GradedSale {
 if(!value||typeof value!=='object')return false
 const v=value as Partial<GradedSale>
 const service=GRADING_SERVICES.find(service=>service.id===v.company)
 if(typeof v.id!=='string'||!v.id||typeof v.cardKey!=='string'||!v.cardKey||!service||!service.grades.some(grade=>grade===v.grade))return false
 if(typeof v.priceEur!=='number'||!Number.isFinite(v.priceEur)||v.priceEur<=0||v.priceEur>10000000)return false
 if(typeof v.soldAt!=='string'||!validDate(v.soldAt)||v.soldAt>new Date().toISOString().slice(0,10))return false
 if(typeof v.marketplace!=='string'||!v.marketplace.trim()||v.marketplace.length>80)return false
 if(typeof v.sourceUrl!=='string'||v.sourceUrl.length>1500)return false
 try{const url=new URL(v.sourceUrl);return (url.protocol==='https:'||url.protocol==='http:')&&Boolean(url.hostname.includes('.'))}catch{return false}
}
export function parseGradedSales(input:unknown):GradedSale[]{
 if(!Array.isArray(input)||input.length>MAX_SALES)throw new Error('Fichier de ventes invalide ou trop volumineux.')
 const seen=new Set<string>()
 return input.map(value=>{
  if(!validGradedSale(value)||seen.has(value.id))throw new Error('Une vente est invalide ou en double.')
  seen.add(value.id)
  return value
 })
}
export function readGradedSales(storage?:Pick<Storage,'getItem'>):GradedSale[]{
 try{const source=storage??(typeof localStorage!=='undefined'?localStorage:undefined);const raw=source?.getItem(GRADED_SALES_STORAGE_KEY);return raw?parseGradedSales(JSON.parse(raw)):[]}catch{return []}
}
export function saveGradedSales(rows:GradedSale[],storage?:Pick<Storage,'setItem'>):void {
 const data=parseGradedSales(rows)
 const target=storage??(typeof localStorage!=='undefined'?localStorage:undefined)
 if(!target)throw new Error('Stockage local indisponible.')
 target.setItem(GRADED_SALES_STORAGE_KEY,JSON.stringify(data))
}
export function createGradedSale(input:GradedSaleInput):GradedSale{
 const id=typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)
 const item={...input,id}
 if(!validGradedSale(item))throw new Error('Renseigne une vente conclue en euros, sa date et son lien source.')
 return item
}
export type SaleStats={count:number;median:number;min:number;max:number;latest:string}
export function calculateSaleStats(sales:readonly GradedSale[],cardKey:string,company:GradingCompany,grade:string,days=365,now=new Date()):SaleStats|undefined{
 const minimum=now.getTime()-days*86400000
 const filtered=sales.filter(s=>s.cardKey===cardKey&&s.company===company&&s.grade===grade&&Date.parse(s.soldAt+'T00:00:00Z')>=minimum&&Date.parse(s.soldAt+'T00:00:00Z')<=now.getTime())
 if(!filtered.length)return undefined
 const prices=filtered.map(s=>s.priceEur).sort((a,b)=>a-b),middle=Math.floor(prices.length/2)
 return {count:prices.length,median:prices.length%2?prices[middle]:(prices[middle-1]+prices[middle])/2,min:prices[0],max:prices[prices.length-1],latest:filtered.reduce((a,b)=>a.soldAt>b.soldAt?a:b).soldAt}
}
/** Surplus de valeur après frais par rapport à une vente brute au même taux de commission.
 * Sans référence brute OU frais explicitement renseignés, aucune rentabilité ne peut être affichée. */
export function gradedPremiumNet(gradedSaleMedian:number|undefined,rawPrice:number|undefined,totalGradingCosts:number|undefined,saleFeePercent:number|undefined):number|undefined {
 if(gradedSaleMedian===undefined||rawPrice===undefined||totalGradingCosts===undefined||saleFeePercent===undefined
  ||![gradedSaleMedian,rawPrice,totalGradingCosts,saleFeePercent].every(Number.isFinite)||totalGradingCosts<0||saleFeePercent<0||saleFeePercent>100)return undefined
 return (gradedSaleMedian-rawPrice)*(1-saleFeePercent/100)-totalGradingCosts
}
export function ebaySoldSearch(name:string,number:string|undefined,setName:string,company:GradingCompany,grade:string,language:string):string{
 // Simple lien de recherche, pas un fournisseur de ventes garanties.
 const query=[name,number,setName,company,grade,language.toUpperCase(),'pokemon'].filter(Boolean).join(' ')
 const params=new URLSearchParams({_nkw:query,LH_Sold:'1',LH_Complete:'1'})
 return 'https://www.ebay.fr/sch/i.html?'+params.toString()
}
