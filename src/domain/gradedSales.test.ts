import {describe,expect,it} from 'vitest'
import {calculateSaleStats,createGradedSale,gradeGroup,gradedPremiumNet,parseGradedSales,validGradedSale,type GradedSale} from './gradedSales'
const sample=(changes:Partial<GradedSale>={}):GradedSale=>({
 id:'sale-a',cardKey:'tcgdex:sv1:sv1-1:fr:normal',company:'PSA',grade:'10',
 priceEur:150,soldAt:'2026-10-15',sourceUrl:'https://www.ebay.fr/itm/12345',marketplace:'eBay',...changes,
})
describe('ventes gradées documentées',()=>{
 it('différencie la carte, la langue, le service, la note et les labels premium',()=>{
  const observations=[
   sample(),sample({id:'b',priceEur:100,sourceUrl:'https://www.ebay.fr/itm/b'}),
   sample({id:'c',company:'CCC',grade:'10 Black Label',priceEur:1000}),
   sample({id:'d',company:'CCC',grade:'10 Gold Label',priceEur:250}),
   sample({id:'e',cardKey:'tcgdex:sv1:sv1-1:en:normal',priceEur:999}),
   sample({id:'f',grade:'9',priceEur:20}),
  ]
  expect(calculateSaleStats(observations,sample().cardKey,'PSA','10',365,new Date('2026-10-26T12:00:00Z'))).toEqual({count:2,median:125,min:100,max:150,latest:'2026-10-15'})
  expect(calculateSaleStats(observations,sample().cardKey,'CCC','10 Black Label',365,new Date('2026-10-26T12:00:00Z'))?.median).toBe(1000)
  expect(calculateSaleStats(observations,sample().cardKey,'CCC','10 Gold Label',365,new Date('2026-10-26T12:00:00Z'))?.median).toBe(250)
  expect(calculateSaleStats(observations,sample().cardKey,'PSA','10',3,new Date('2026-10-26T12:00:00Z'))).toBeUndefined()
 })
 it('n’affiche aucune prime sans ventes, valeur brute et frais renseignés',()=>{
  expect(gradedPremiumNet(200,100,35,10)).toBe(55)
  expect(gradedPremiumNet(undefined,100,35,10)).toBeUndefined()
  expect(gradedPremiumNet(200,100,undefined,10)).toBeUndefined()
  expect(gradedPremiumNet(200,100,35,undefined)).toBeUndefined()
 })
 it('rejette les chiffres non vérifiables et les faux URL',()=>{
  expect(validGradedSale(sample())).toBe(true)
  expect(validGradedSale(sample({grade:'11'}))).toBe(false)
  expect(validGradedSale(sample({priceEur:0}))).toBe(false)
  expect(validGradedSale(sample({sourceUrl:'javascript:alert(1)'}))).toBe(false)
  expect(()=>parseGradedSales([sample(),sample()])).toThrow(/double/)
  expect(gradeGroup('10 Black Label')).toBe('10')
  expect(gradeGroup('10 Perfect')).toBe('10')
 })
 it('accepte une vente structurée pour CollectAura et sa note précise',()=>{
  const {id:_,...input}=sample({id:'to-remove',company:'CollectAura',grade:'10 Perfect'})
  expect(createGradedSale(input).company).toBe('CollectAura')
 })
})
