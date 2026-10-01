import {describe,expect,it} from 'vitest'
import {recordPriceSnapshot} from './priceHistory'
describe('price history',()=>{it('conserve un seul snapshot par carte, langue et jour',()=>{let value='[]';const storage={getItem:()=>value,setItem:(_k:string,v:string)=>{value=v}};recordPriceSnapshot({cardId:'x',language:'fr',date:'2026-10-01',value:2,source:'cardmarket'},storage);const result=recordPriceSnapshot({cardId:'x',language:'fr',date:'2026-10-01',value:3,source:'cardmarket'},storage);expect(result).toHaveLength(1);expect(result[0].value).toBe(3)})})
