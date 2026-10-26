/** Agrégats de ventes terminées fournis par une source externe.
 * Les moyennes quotidiennes pondérées et les médianes de fenêtre NE sont PAS des ventes individuelles.
 * Ne jamais les mélanger avec les ventes documentées dans gradedSales.ts.
 */
import { GRADING_SERVICES, type GradingCompany } from './gradedSales'

export type GradedMarketPoint={
 date:string
 averageEur:number
 count:number
}
export type GradedMarketQuote={
 cardKey:string
 provider:'cardstand'
 company:GradingCompany
 grade:string
 finish:string
 currency:'EUR'
 fetchedAt:string
 lastSaleAt?:string
 lastSoldEur?:number
 median30?:number
 average30?:number
 count30?:number
 count90?:number
 low90?:number
 high90?:number
 history:GradedMarketPoint[]
}
export type GradedMarketFeed={
 schemaVersion:1
 generatedAt:string|null
 status:'unconfigured'|'active'
 quotes:GradedMarketQuote[]
}
export const EMPTY_GRADED_MARKET:GradedMarketFeed={
 schemaVersion:1,generatedAt:null,status:'unconfigured',quotes:[],
}
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)
const dateIsValid=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value
const timestampIsValid=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value))
const optionalPrice=(value:unknown)=>value===undefined||(typeof value==='number'&&Number.isFinite(value)&&value>0&&value<10000000)
const optionalCount=(value:unknown)=>value===undefined||(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=10000000)
function parseQuote(item:unknown):GradedMarketQuote{
 if(!isRecord(item)||typeof item.cardKey!=='string'||!item.cardKey
  ||item.provider!=='cardstand'||item.currency!=='EUR'||typeof item.finish!=='string'||!item.finish
  ||!timestampIsValid(item.fetchedAt)||!Array.isArray(item.history)||item.history.length>2000){
  throw new Error('Référence gradée automatique invalide.')
 }
 const company=GRADING_SERVICES.find(company=>company.id===item.company)
 if(!company||typeof item.grade!=='string'||!company.grades.some(grade=>grade===item.grade))throw new Error('Société ou note gradée invalide.')
 for(const field of ['median30','average30','lastSoldEur','low90','high90'] as const)if(!optionalPrice(item[field]))throw new Error('Prix gradé invalide.')
 for(const field of ['count30','count90'] as const)if(!optionalCount(item[field]))throw new Error('Nombre de transactions invalide.')
 if(item.lastSaleAt!==undefined&&!dateIsValid(item.lastSaleAt))throw new Error('Date de vente invalide.')
 const seen=new Set<string>()
 const history=item.history.map((point:unknown)=>{
  if(!isRecord(point)||!dateIsValid(point.date)||!optionalPrice(point.averageEur)||point.averageEur===undefined
    ||!optionalCount(point.count)||point.count===0||seen.has(point.date))throw new Error('Historique gradé invalide.')
  seen.add(point.date)
  return {date:point.date,averageEur:point.averageEur as number,count:point.count as number}
 })
 return {...item,company:company.id,history:history.sort((a,b)=>a.date.localeCompare(b.date))} as GradedMarketQuote
}
export function parseGradedMarketFeed(value:unknown):GradedMarketFeed{
 if(!isRecord(value)||value.schemaVersion!==1||!['active','unconfigured'].includes(String(value.status))
  ||(value.generatedAt!==null&&!timestampIsValid(value.generatedAt))||!Array.isArray(value.quotes)||value.quotes.length>20000)
  throw new Error('Format des données gradées incompatible.')
 const quotes=value.quotes.map(parseQuote),seen=new Set<string>()
 for(const quote of quotes){
  const key=[quote.cardKey,quote.provider,quote.company,quote.grade,quote.finish].join('|')
  if(seen.has(key))throw new Error('Cote gradée dupliquée.')
  seen.add(key)
 }
 return {schemaVersion:1,generatedAt:value.generatedAt as string|null,status:value.status as GradedMarketFeed['status'],quotes}
}
/** Une synchronisation vide ne supprime jamais une cote historique.
 * L'historique antérieur est conservé; une observation sur le même jour est remplacée par l'actualisation.
 * Les agrégats courants viennent exclusivement de la nouvelle collecte.
 */
export function mergeGradedMarket(previous:GradedMarketFeed,next:GradedMarketFeed):GradedMarketFeed{
 const latest=parseGradedMarketFeed(next)
 if(latest.status==='unconfigured')return previous
 // An old Pages artifact or intermediate CDN cache must not revert newer observations.
 if(previous.generatedAt&&latest.generatedAt&&Date.parse(latest.generatedAt)<Date.parse(previous.generatedAt))return previous
 const prior=new Map(previous.quotes.map(quote=>[[quote.cardKey,quote.provider,quote.company,quote.grade,quote.finish].join('|'),quote]))
 const updated=latest.quotes.map(quote=>{
  const key=[quote.cardKey,quote.provider,quote.company,quote.grade,quote.finish].join('|')
  const old=prior.get(key);prior.delete(key)
  const rows=new Map((old?.history??[]).map(point=>[point.date,point]))
  for(const point of quote.history)rows.set(point.date,point)
  return {...quote,history:[...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-1825)}
 })
 return {...latest,quotes:[...updated,...prior.values()]}
}
export function gradedMarketForCard(feed:GradedMarketFeed,cardKey:string){
 return feed.quotes.filter(item=>item.cardKey===cardKey)
}
export function quoteFreshness(quote:GradedMarketQuote,now=Date.now()){
 const age=now-Date.parse(quote.fetchedAt)
 return age<0||age>7*86400000?'stale':age>48*3600000?'aging':'fresh'
}
