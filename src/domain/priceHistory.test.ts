import {describe,expect,it} from 'vitest'
import {getAllPriceHistory,mergePriceHistory,parsePriceHistoryDocument,recordPriceSnapshot} from './priceHistory'

describe('price history',()=>{
 it('conserve un seul snapshot par carte, langue et jour',()=>{
  let value='[]';const storage={getItem:()=>value,setItem:(_k:string,v:string)=>{value=v}}
  recordPriceSnapshot({cardId:'x',language:'fr',date:'2026-10-01',value:2,source:'cardmarket'},storage)
  const result=recordPriceSnapshot({cardId:'x',language:'fr',date:'2026-10-01',value:3,source:'cardmarket'},storage)
  expect(result).toHaveLength(1);expect(result[0].value).toBe(3)
 })
 it('lit uniquement les relevés locaux valides',()=>{
  const value=JSON.stringify([{cardId:'x',language:'fr',date:'2026-02-02',value:3,source:'cardmarket'},{cardId:'x',language:'fr',date:'2026-01-01',value:2,source:'cardmarket'},{cardId:'x',language:'en',date:'2026-01-01',value:4,source:'cardmarket'},{cardId:'bad',language:'fr',date:'today',value:'bad',source:'cardmarket'}])
  expect(getAllPriceHistory({getItem:()=>value}).map(x=>x.value)).toEqual([2,4,3])
 })
 it('fusionne les appareils et garde le relevé le plus récent du même jour',()=>{
  const remote=[{cardId:'x',language:'fr',date:'2026-10-01',value:2,source:'cardmarket',recordedAt:'2026-10-01T08:00:00.000Z'}]
  const local=[{cardId:'x',language:'fr',date:'2026-10-01',value:3,source:'cardmarket',recordedAt:'2026-10-01T09:00:00.000Z'},{cardId:'x',language:'fr',date:'2026-10-02',value:4,source:'cardmarket'}]
  const result=mergePriceHistory(local,remote)
  expect(result).toHaveLength(2);expect(result[0].value).toBe(3);expect(result[1].date).toBe('2026-10-02')
 })
 it('valide la version et les relevés du fichier distant',()=>{
  const document=parsePriceHistoryDocument({schemaVersion:1,updatedAt:'2026-10-04T08:00:00.000Z',snapshots:[{cardId:'x',language:'fr',date:'2026-10-04',value:5,source:'cardmarket'}]})
  expect(document.snapshots).toHaveLength(1)
  expect(()=>parsePriceHistoryDocument({schemaVersion:2,snapshots:[]})).toThrow()
 })
})
