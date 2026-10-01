export type PriceSnapshot={cardId:string;language:string;date:string;value:number;source:string}
const KEY='price-history-v1',MAX=1200
export function recordPriceSnapshot(snapshot:PriceSnapshot,storage:Pick<Storage,'getItem'|'setItem'>=localStorage){
 let history:PriceSnapshot[]=[];try{const parsed=JSON.parse(storage.getItem(KEY)??'[]');if(Array.isArray(parsed))history=parsed}catch{/* replace malformed local data */}
 const identity=`${snapshot.language}:${snapshot.cardId}:${snapshot.date}`
 history=[...history.filter(x=>`${x.language}:${x.cardId}:${x.date}`!==identity),snapshot].slice(-MAX)
 storage.setItem(KEY,JSON.stringify(history));return history
}
export function todayPriceDate(){return new Date().toISOString().slice(0,10)}
