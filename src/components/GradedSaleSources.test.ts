import {describe,expect,it} from 'vitest'
import {ebayGlobalSoldSearch,priceChartingSearch} from './GradedSaleSources'
import {ebaySoldSearch} from '../domain/gradedSales'

const card={name:'Dracaufeu',number:'004',setName:'Set de Base',language:'fr'}
describe('liens de ventes réellement conclues',()=>{
 it('construit une recherche eBay filtrée sur vendus, société et note',()=>{
  for(const grader of ['PSA','CCC','CollectAura','PCA','BGS','CGC'] as const){
   const url=new URL(ebayGlobalSoldSearch(card,grader,'10'))
   expect(url.hostname).toBe('www.ebay.com')
   expect(url.searchParams.get('LH_Sold')).toBe('1')
   expect(url.searchParams.get('LH_Complete')).toBe('1')
   expect(url.searchParams.get('_nkw')).toContain(grader)
   expect(url.searchParams.get('_nkw')).toContain('10')
  }
  const french=new URL(ebaySoldSearch(card.name,card.number,card.setName,'CCC','10 Gold Label','fr'))
  expect(french.hostname).toBe('www.ebay.fr')
  expect(french.searchParams.get('_nkw')).toContain('Gold Label')
 })
 it('ouvre un guide externe sans inventer de prix ni grade présélectionné',()=>{
  const url=new URL(priceChartingSearch(card))
  expect(url.hostname).toBe('www.pricecharting.com')
  expect(url.pathname).toBe('/search-products')
  expect(url.searchParams.get('q')).toContain(card.name)
  expect(url.searchParams.get('type')).toBe('prices')
 })
})
