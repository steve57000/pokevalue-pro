// @vitest-environment jsdom
import {createElement,act} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
import {GradedSalesComparison} from './GradedSalesComparison'
import {emptyCollection,upsertEntry} from '../domain/collection'
import {type GradedSale} from '../domain/gradedSales'
it('montre les seuls prix constatés, sépare les sections et met les bons filtres dans les liens',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 const entry=upsertEntry(emptyCollection(),{source:'tcgdex',setId:'me02',cardId:'me02-118',language:'fr',variant:'normal',name:'Méga-Kravarech-ex',setName:'Chaos Ascendant',number:'118',quantity:1,condition:'mint',notes:''}).entries[0]
 const sales:GradedSale[]=[{id:'one',cardKey:entry.key,company:'PCA',grade:'10',priceEur:81,soldAt:'2026-10-05',marketplace:'eBay',sourceUrl:'https://www.ebay.fr/itm/one'},{id:'two',cardKey:entry.key,company:'PCA',grade:'10',priceEur:115,soldAt:'2026-10-17',marketplace:'eBay',sourceUrl:'https://www.ebay.fr/itm/two'}]
 const host=document.createElement('div'),root=createRoot(host)
 await act(async()=>root.render(createElement(GradedSalesComparison,{entry,sales,onSave:()=>true,onRemove:vi.fn(),onSettings:vi.fn()})))
 expect(host.querySelectorAll('.observed-price')).toHaveLength(1)
 expect(host.querySelector('.observed-price')!.textContent).toContain('98')
 expect(host.querySelectorAll('details[open]')).toHaveLength(1)
 expect(host.querySelectorAll('table')).toHaveLength(0)
 expect(host.textContent).not.toMatch(/Mes ventes documentées|vente personnelle|Historique local/)
 const selects=host.querySelectorAll('.source-selectors select')
 await act(async()=>{(selects[0] as HTMLSelectElement).value='CCC';selects[0].dispatchEvent(new Event('change',{bubbles:true}))})
 const link=host.querySelector('.source-actions a') as HTMLAnchorElement
 expect(new URL(link.href).searchParams.get('_nkw')).toContain('CCC 10 Black Label')
 expect(new URL(link.href).searchParams.get('LH_Sold')).toBe('1')
 act(()=>root.unmount())
})
