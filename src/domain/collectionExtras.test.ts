import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest'
import {emptyCollection,mergeCollections,parseCollection,printingKey,updateCollectionCard,upsertEntry} from './collection'
import {addPersonalSales,availableQuantity,changeListedFormat,completePersonalSale,migrateMarketObservations,removePersonalSale,saveGradingSettings,saveObservations,updatePersonalSale} from './collectionExtras'
import {calculateSaleStats,type GradedSale} from './gradedSales'
const card={source:'tcgdex' as const,setId:'me02',cardId:'me02-118',language:'fr',variant:'normal',name:'Méga-Kravarech-ex',setName:'Chaos Ascendant',number:'118',quantity:3,condition:'near-mint' as const,notes:''}
const market=(id:string,priceEur:number,soldAt:string):GradedSale=>({id,cardKey:printingKey(card),company:'PCA',grade:'10',priceEur,soldAt,marketplace:'eBay',sourceUrl:'https://www.ebay.fr/itm/'+id})
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-27T12:00:00Z'))})
afterEach(()=>vi.useRealTimers())
describe('relevés de marché et sauvegarde complète',()=>{
 it('migre une seule fois les anciens relevés sans les transformer en ventes personnelles',()=>{
  const legacy=[market('one',115,'2026-10-17'),market('two',81,'2026-10-05')]
  const doc=migrateMarketObservations(upsertEntry(emptyCollection(),card),legacy)
  expect(doc.personalSales).toEqual([])
  expect(calculateSaleStats(doc.marketObservations!,printingKey(card),'PCA','10')?.median).toBe(98)
  expect(migrateMarketObservations(doc,legacy)).toBe(doc)
  expect(doc.entries[0].quantity).toBe(3)
  expect(parseCollection(JSON.parse(JSON.stringify(doc))).marketObservations).toEqual(doc.marketObservations)
 })
 it('préserve les liens et les suppressions après fusion et nouvelle migration',()=>{
  const row=market('one',115,'2026-10-17'),old=migrateMarketObservations(emptyCollection(),[row])
  const removed=saveObservations(old,[])
  const merged=mergeCollections(removed,old)
  expect(merged.marketObservations![0].deletedAt).toBeTruthy()
  expect(migrateMarketObservations(merged,[row]).marketObservations!.filter(s=>!s.deletedAt)).toHaveLength(0)
  const edited=saveObservations(old,[{...row,priceEur:110}])
  expect(mergeCollections(old,edited).marketObservations![0]).toMatchObject({priceEur:110,sourceUrl:row.sourceUrl})
 })
 it('restaure relevés, frais, exemplaires gradés et ventes dans le même document',()=>{
  let doc=migrateMarketObservations(upsertEntry(emptyCollection(),card),[market('one',115,'2026-10-17')])
  doc=addPersonalSales(doc,[{cardKey:printingKey(card),quantity:1}])
  doc=changeListedFormat(doc,doc.personalSales![0].id,{company:'CCC',grade:'10 Gold Label',certificate:'cert-test'})
  doc=saveGradingSettings(doc,{cardKey:printingKey(card),costs:{CCC:'20'},feePercent:'10'})
  const restored=parseCollection(JSON.parse(JSON.stringify(mergeCollections(emptyCollection(),doc))))
  expect(restored.entries[0].gradedCopies![0]).toMatchObject({company:'CCC',grade:'10 Gold Label'})
  expect(restored.personalSales![0].copyId).toBe(restored.entries[0].gradedCopies![0].id)
  expect(restored.gradingSettings![0].costs.CCC).toBe('20')
  expect(restored.marketObservations).toHaveLength(1)
 })
})
describe('stock et ventes personnelles',()=>{
 it('réserve plusieurs cartes sans modifier le stock et refuse les doublons',()=>{
  let doc=upsertEntry(upsertEntry(emptyCollection(),card),{...card,cardId:'me02-1'})
  doc=addPersonalSales(doc,[{cardKey:printingKey(card),quantity:2},{cardKey:printingKey({...card,cardId:'me02-1'}),quantity:1}])
  expect(doc.entries.map(e=>e.quantity)).toEqual([3,3])
  expect(availableQuantity(doc,doc.entries[0])).toBe(1)
  expect(()=>addPersonalSales(doc,[{cardKey:printingKey(card),quantity:2}])).toThrow(/indisponible/)
  doc=removePersonalSale(doc,doc.personalSales![0].id)
  expect(availableQuantity(doc,doc.entries[0])).toBe(3)
 })
 it('convertit un seul exemplaire brut en gradé puis en brut sans changer le total',()=>{
  let doc=addPersonalSales(upsertEntry(emptyCollection(),card),[{cardKey:printingKey(card),quantity:1}])
  const id=doc.personalSales![0].id
  doc=changeListedFormat(doc,id,{company:'PCA',grade:'10',certificate:'123'})
  expect(doc.entries[0].quantity).toBe(3)
  expect(doc.entries[0].gradedCopies).toHaveLength(1)
  expect(availableQuantity(doc,doc.entries[0])).toBe(2)
  expect(availableQuantity(doc,doc.entries[0],doc.personalSales![0].copyId)).toBe(0)
  doc=changeListedFormat(doc,id)
  expect(doc.entries[0].gradedCopies).toHaveLength(0)
  expect(doc.personalSales![0].copyId).toBeUndefined()
  expect(availableQuantity(doc,doc.entries[0])).toBe(2)
 })
 it('retire uniquement l’exemplaire vendu et conserve le certificat sans alimenter les relevés du marché',()=>{
  let doc=addPersonalSales(upsertEntry(emptyCollection(),card),[{cardKey:printingKey(card),quantity:1}])
  const id=doc.personalSales![0].id
  doc=changeListedFormat(doc,id,{company:'PCA',grade:'10',certificate:'123'})
  doc=completePersonalSale(doc,id,120,'2026-10-27')
  expect(doc.entries[0].quantity).toBe(2)
  expect(doc.entries[0].gradedCopies).toEqual([])
  expect(doc.personalSales![0]).toMatchObject({status:'sold',priceEur:120,certificate:'123'})
  expect(doc.marketObservations??[]).toHaveLength(0)
  expect(()=>completePersonalSale(doc,id,120,'2026-10-27')).toThrow()
 })
 it('conserve les grades avec les quantités et annule une annonce lors du retrait de la collection',()=>{
  let doc=upsertEntry(emptyCollection(),{...card,gradedCopies:[{id:'copy',company:'PSA',grade:'9',certificate:''}]})
  doc=addPersonalSales(doc,[{cardKey:printingKey(card),copyId:'copy',quantity:1}])
  doc=updateCollectionCard(doc,card,{quantity:4})
  expect(doc.entries[0].gradedCopies![0].grade).toBe('9')
  doc=updateCollectionCard(doc,card,{quantity:0})
  expect(doc.personalSales![0].deletedAt).toBeTruthy()
  expect(parseCollection(JSON.parse(JSON.stringify(doc))).entries[0].quantity).toBe(0)
 })
 it('rejette les quantités, prix et liens invalides avant toute modification',()=>{
  const doc=addPersonalSales(upsertEntry(emptyCollection(),card),[{cardKey:printingKey(card),quantity:1}]),sale=doc.personalSales![0]
  for(const changes of [{quantity:4},{quantity:1.5},{priceEur:NaN},{url:'javascript:alert(1)'}])expect(()=>updatePersonalSale(doc,{...sale,...changes})).toThrow()
  expect(()=>completePersonalSale(doc,sale.id,NaN,'2026-10-27')).toThrow()
  expect(()=>completePersonalSale(doc,sale.id,12,'2026-02-31')).toThrow()
  expect(()=>parseCollection({...doc,entries:[{...doc.entries[0],gradedCopies:[{id:'bad',company:'PCA',grade:'11',certificate:''}]}]})).toThrow()
 })
})

it('met à jour l’annonce quand le format est modifié depuis la collection',()=>{
 let doc=addPersonalSales(upsertEntry(emptyCollection(),{...card,quantity:1}),[{cardKey:printingKey(card),quantity:1}])
 doc=updateCollectionCard(doc,card,{gradedCopies:[{id:'new-copy',company:'PCA',grade:'10',certificate:''}]})
 expect(doc.personalSales![0]).toMatchObject({copyId:'new-copy',company:'PCA',grade:'10'})
 expect(doc.personalSales![0].deletedAt).toBeUndefined()
 doc=updateCollectionCard(doc,card,{gradedCopies:[]})
 expect(doc.personalSales![0].copyId).toBeUndefined()
 expect(doc.personalSales![0].deletedAt).toBeUndefined()
 expect(doc.entries[0].quantity).toBe(1)
})
