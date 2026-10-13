import {describe,expect,it} from 'vitest'
import {getAllPriceHistory,getPriceHistory,mergePriceHistory,parsePriceHistoryDocument,recordPriceSnapshot,recordPriceSnapshots,snapshotsFromQuotes,type PriceSnapshot} from './priceHistory'
import {collectMarketPriceQuotes} from './pricing'

const snapshot=(overrides:Partial<PriceSnapshot>={}):PriceSnapshot=>{
 const row={cardId:'x',language:'fr',date:'2026-10-01',value:2,source:'cardmarket',aggregator:'tcgdex',market:'cardmarket-europe',currency:'EUR',printingLanguage:'unknown' as const,variant:'normal' as const,condition:'unknown',basis:'guide' as const,aggregation:'aggregate' as const,metric:'trend',recordedAt:'2026-10-01T08:00:00.000Z',...overrides}
 return {...row,quotes:overrides.quotes??[{value:row.value,basis:row.basis,aggregation:row.aggregation,metric:row.metric}]}
}

describe('price history',()=>{
 it('keeps one daily observation per source, market, finish, and basis',()=>{
  let value='[]';const storage={getItem:()=>value,setItem:(_k:string,v:string)=>{value=v}}
  recordPriceSnapshot(snapshot(),storage)
  const updated=recordPriceSnapshot(snapshot({value:3,recordedAt:'2026-10-01T09:00:00.000Z'}),storage)
  const otherSource=recordPriceSnapshot(snapshot({source:'tcgplayer',aggregator:'tcgdex',market:'tcgplayer-north-america',currency:'USD',variant:'normal',value:4}),storage)
  expect(updated).toHaveLength(1);expect(updated[0].value).toBe(3)
  expect(otherSource).toHaveLength(2)
 })

 it('stores every source metric with its own distinct price basis',()=>{
  const quotes=collectMarketPriceQuotes({cardmarket:{unit:'EUR',idProduct:99,updated:'2026-10-01',trend:10,avg7:9,avg30:8,low:5}},'fr','2026-10-01T08:00:00.000Z')
  const records=snapshotsFromQuotes('x',quotes,'2026-10-01')
  expect(records).toHaveLength(1)
  const [record]=records
  expect(record).toMatchObject({value:10,source:'cardmarket',market:'cardmarket-europe',currency:'EUR',printingLanguage:'unknown',variant:'normal',condition:'unknown',basis:'guide'})
  expect(record.quotes).toEqual(expect.arrayContaining([
   expect.objectContaining({metric:'trend',basis:'guide',value:10}),
   expect.objectContaining({metric:'avg7',basis:'completed-sale',value:9}),
   expect.objectContaining({metric:'avg30',basis:'completed-sale',value:8}),
   expect.objectContaining({metric:'low',basis:'listing',value:5}),
  ]))
 })

 it('migrates legacy local rows with explicit unknown print and condition fields',()=>{
  const value=JSON.stringify([{cardId:'x',language:'fr',date:'2026-02-02',value:3,source:'cardmarket'},{cardId:'x',language:'fr',date:'2026-01-01',value:2,source:'cardmarket'},{cardId:'x',language:'en',date:'2026-01-01',value:4,source:'cardmarket'},{cardId:'bad',language:'fr',date:'today',value:'bad',source:'cardmarket'}])
  const history=getAllPriceHistory({getItem:()=>value})
  expect(history.map(x=>x.value)).toEqual([2,4,3])
  expect(history[0]).toMatchObject({market:'cardmarket-europe',currency:'EUR',printingLanguage:'unknown',condition:'unknown',basis:'unknown'})
 })

 it('keeps listing, guide, and completed-sale rows separate',()=>{
  const cardmarket=snapshot({date:'2026-10-01'})
  const listing=snapshot({date:'2026-10-01',basis:'listing',source:'ebay',aggregator:'manual',market:'france',currency:'EUR'})
  const sale=snapshot({date:'2026-10-01',basis:'completed-sale',source:'ebay',aggregator:'manual',market:'france',currency:'EUR',value:9})
  const merged=mergePriceHistory([cardmarket,listing,sale])
  expect(merged).toHaveLength(2)
  expect(merged.find(row=>row.source==='ebay')?.quotes.map(quote=>quote.basis).sort()).toEqual(['completed-sale','listing'])
 })

 it('keeps a changed upstream product mapping separate in history',()=>{
  const first=snapshot({externalProductId:'old-id'})
  const remapped=snapshot({externalProductId:'new-id',value:3})
  expect(mergePriceHistory([first,remapped])).toHaveLength(2)
 })

 it('writes a batch of provider quotes to storage once',()=>{
  let value='[]',writes=0;const storage={getItem:()=>value,setItem:(_k:string,v:string)=>{writes++;value=v}}
  const rows=snapshotsFromQuotes('x',collectMarketPriceQuotes({cardmarket:{trend:4,low:2},tcgplayer:{normal:{marketPrice:3,lowPrice:1}}},'en','2026-10-01T08:00:00.000Z'),'2026-10-01')
  recordPriceSnapshots(rows,storage)
  expect(writes).toBe(1);expect(getAllPriceHistory(storage)).toHaveLength(2)
 })

 it('merges devices and keeps the newest observation for the same quote that day',()=>{
  const remote=[snapshot({value:2,recordedAt:'2026-10-01T08:00:00.000Z'})]
  const local=[snapshot({value:3,recordedAt:'2026-10-01T09:00:00.000Z'}),snapshot({date:'2026-10-02',value:4})]
  const result=mergePriceHistory(local,remote)
  expect(result).toHaveLength(2);expect(result[0].value).toBe(3);expect(result[1].date).toBe('2026-10-02')
 })

 it('migrates version 1 documents and writes schema version 2',()=>{
  const document=parsePriceHistoryDocument({schemaVersion:1,updatedAt:'2026-10-04T08:00:00.000Z',snapshots:[{cardId:'x',language:'fr',date:'2026-10-04',value:5,source:'cardmarket'}]})
  expect(document.schemaVersion).toBe(2)
  expect(document.snapshots[0]).toMatchObject({market:'cardmarket-europe',currency:'EUR',basis:'unknown'})
  expect(()=>parsePriceHistoryDocument({schemaVersion:2,updatedAt:'2026-10-04T08:00:00.000Z',snapshots:[{cardId:'x',language:'fr',date:'2026-10-04',value:5,source:'cardmarket'}]})).toThrow()
 })

 it('allows graph history to select one stable European normal guide series',()=>{
  const rows=[snapshot({value:10}),snapshot({date:'2026-10-02',source:'tcgplayer',market:'tcgplayer-north-america',currency:'USD'}),snapshot({date:'2026-10-02',variant:'holofoil',value:15}),snapshot({date:'2026-10-03',basis:'listing',value:12})]
  const history=getPriceHistory('x','fr',{getItem:()=>JSON.stringify(rows)})
  expect(history.map(x=>x.value)).toEqual([10])
 })

 it('rejects a new quote without complete provenance',()=>{
  const storage={getItem:()=> '[]',setItem:()=>undefined}
  expect(()=>recordPriceSnapshot({cardId:'x',language:'fr',date:'2026-10-01',value:2,source:'cardmarket'} as PriceSnapshot,storage)).toThrow('provenance')
 })
})
