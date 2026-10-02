import { describe, expect, it } from 'vitest'
import { collectionUnitPrice, emptyCollection, mergeCollections, printingKey, upsertEntry } from './collection'

const entry = { source:'tcgdex' as const,setId:'sv01',cardId:'sv01-1',language:'fr',variant:'normal',name:'Carte',setName:'Série',quantity:1,condition:'near-mint' as const,notes:'' }
describe('collection portfolio', () => {
  it('conserve le prix manuel ou revient au prix marché choisi',()=>{expect(collectionUnitPrice({manualPrice:90,priceMode:'manual'},60)).toBe(90);expect(collectionUnitPrice({manualPrice:90,priceMode:'market'},60)).toBe(60)})
  it('préserve le mode historique des anciennes entrées',()=>{expect(collectionUnitPrice({manualPrice:90},60)).toBe(90);expect(collectionUnitPrice({},60)).toBe(60)})
  it('keeps provider, set, card, language and variant in the identity', () => expect(printingKey(entry)).toBe('tcgdex:sv01:sv01-1:fr:normal'))
  it('updates quantities without duplicating an impression', () => { const one=upsertEntry(emptyCollection(),entry); const two=upsertEntry(one,{...entry,quantity:3}); expect(two.entries).toHaveLength(1); expect(two.entries[0].quantity).toBe(3) })
  it('merges concurrent documents using the latest entry', () => { const a=upsertEntry(emptyCollection(),entry); const b={...a,entries:[{...a.entries[0],quantity:2,updatedAt:'9999-01-01T00:00:00.000Z'}]}; expect(mergeCollections(a,b).entries[0].quantity).toBe(2) })
  it('keeps a removal during sync so older devices cannot restore the card', () => {
    const added = upsertEntry(emptyCollection(), entry)
    const removed = upsertEntry(added, { ...entry, quantity: 0 })
    expect(removed.entries[0].quantity).toBe(0)
    expect(mergeCollections(added, removed).entries[0].quantity).toBe(0)
  })
})

import {totalValuesByCurrency} from './collection'
it('multiplie les quantités mais ne mélange jamais EUR et USD',()=>expect(totalValuesByCurrency([{value:10,quantity:3,currency:'EUR'},{value:5,quantity:2,currency:'USD'}])).toEqual({EUR:30,USD:10}))
