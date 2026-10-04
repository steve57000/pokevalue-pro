export type PriceSnapshot={cardId:string;language:string;date:string;value:number;source:string;recordedAt?:string}
export type PriceHistoryDocument={schemaVersion:1;updatedAt:string;snapshots:PriceSnapshot[]}
const KEY='price-history-v1',MAX=20000

function validSnapshot(value:unknown):value is PriceSnapshot{
 if(!value||typeof value!=='object')return false
 const item=value as Partial<PriceSnapshot>
 return typeof item.cardId==='string'&&Boolean(item.cardId)&&typeof item.language==='string'&&Boolean(item.language)
  &&typeof item.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)
  &&typeof item.value==='number'&&Number.isFinite(item.value)&&item.value>0
  &&typeof item.source==='string'&&Boolean(item.source)
  &&(item.recordedAt===undefined||(typeof item.recordedAt==='string'&&Number.isFinite(Date.parse(item.recordedAt))))
}

export function parsePriceHistoryDocument(value:unknown):PriceHistoryDocument{
 if(!value||typeof value!=='object')throw new Error('Fichier d’historique de prix invalide')
 const candidate=value as Partial<PriceHistoryDocument>
 if(candidate.schemaVersion!==1||!Array.isArray(candidate.snapshots)||typeof candidate.updatedAt!=='string')throw new Error('Version du fichier d’historique de prix non prise en charge')
 if(candidate.snapshots.some(snapshot=>!validSnapshot(snapshot)))throw new Error('Le fichier d’historique contient un relevé invalide')
 return {schemaVersion:1,updatedAt:candidate.updatedAt,snapshots:mergePriceHistory(candidate.snapshots as PriceSnapshot[])}
}

function snapshotTime(snapshot:PriceSnapshot){return snapshot.recordedAt?Date.parse(snapshot.recordedAt):Date.parse(`${snapshot.date}T00:00:00Z`)}
function historyKey(snapshot:PriceSnapshot){return `${snapshot.language}:${snapshot.cardId}:${snapshot.date}`}

export function mergePriceHistory(local:PriceSnapshot[],remote:PriceSnapshot[]=[]):PriceSnapshot[]{
 const merged=new Map<string,PriceSnapshot>()
 for(const snapshot of [...remote,...local]){
  const key=historyKey(snapshot),current=merged.get(key)
  if(!current||snapshotTime(snapshot)>=snapshotTime(current))merged.set(key,snapshot)
 }
 return [...merged.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.language.localeCompare(b.language)||a.cardId.localeCompare(b.cardId)).slice(-MAX)
}

export function samePriceHistory(a:PriceSnapshot[],b:PriceSnapshot[]){
 const left=mergePriceHistory(a),right=mergePriceHistory(b)
 return left.length===right.length&&left.every((item,index)=>JSON.stringify(item)===JSON.stringify(right[index]))
}

function readHistory(storage:Pick<Storage,'getItem'>):PriceSnapshot[]{
 try{const parsed=JSON.parse(storage.getItem(KEY)??'[]');if(!Array.isArray(parsed))return [];return parsed.filter(validSnapshot)}catch{return []}
}
function saveHistory(history:PriceSnapshot[],storage:Pick<Storage,'setItem'>){
 storage.setItem(KEY,JSON.stringify(mergePriceHistory(history)))
}
function usesBrowserStorage(storage:Pick<Storage,'getItem'>|Pick<Storage,'setItem'>){return typeof window!=='undefined'&&storage===window.localStorage}
function announceHistoryChange(){
 if(typeof window!=='undefined')window.dispatchEvent(new Event('pv-price-history-updated'))
}

export function recordPriceSnapshot(snapshot:PriceSnapshot,storage:Pick<Storage,'getItem'|'setItem'>=localStorage){
 const before=readHistory(storage)
 const existing=before.find(item=>historyKey(item)===historyKey(snapshot))
 if(existing&&existing.value===snapshot.value&&existing.source===snapshot.source)return before
 const recorded={...snapshot,recordedAt:snapshot.recordedAt??new Date().toISOString()}
 const history=mergePriceHistory([recorded],before)
 if(!samePriceHistory(before,history)){saveHistory(history,storage);if(usesBrowserStorage(storage))announceHistoryChange()}
 return history
}
export function replacePriceHistory(history:PriceSnapshot[],storage:Pick<Storage,'getItem'|'setItem'>=localStorage,notify=true){
 const next=mergePriceHistory(history),before=readHistory(storage)
 if(!samePriceHistory(before,next)){saveHistory(next,storage);if(notify&&usesBrowserStorage(storage))announceHistoryChange()}
}
export function todayPriceDate(){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
}
export function getPriceHistory(cardId:string,language:string,storage:Pick<Storage,'getItem'>=localStorage):PriceSnapshot[]{
 return readHistory(storage).filter(point=>point.cardId===cardId&&point.language===language).sort((a,b)=>a.date.localeCompare(b.date))
}
export function getAllPriceHistory(storage:Pick<Storage,'getItem'>=localStorage):PriceSnapshot[]{
 return readHistory(storage).sort((a,b)=>a.date.localeCompare(b.date))
}
