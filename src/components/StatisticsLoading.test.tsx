// @vitest-environment jsdom
import { IDBFactory } from 'fake-indexeddb'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { PriceHistoryPage } from './PriceHistoryPage'
import { emptyCollection, upsertEntry } from '../domain/collection'
import { flushPriceHistory, getAllPriceHistory, initializePriceHistory } from '../domain/priceHistory'
vi.mock('../api/tcgdex',()=>({tcgDexProvider:{getCard:vi.fn(async(id:string)=>({id,pricing:{cardmarket:{trend:id.endsWith('001')?100:20,avg7:12,avg30:10}}}))}}))
vi.mock('./CatalogueImage',()=>({CatalogueImage:()=>null}))
it('keeps real hook prices and manual values through loading, navigation and persistence',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});localStorage.clear();sessionStorage.clear()
  vi.stubGlobal('indexedDB',new IDBFactory())
  await initializePriceHistory()
  const entries=['Dracaufeu','Magicarpe'].map((name,i)=>upsertEntry(emptyCollection(),{source:'tcgdex',setId:'30th-c',cardId:i?'30th-c-030':'30th-c-001',language:'fr',variant:'normal',name,setName:'Classique',quantity:i?1:2,condition:'mint',notes:'',...(i?{}:{manualPrice:150})}).entries[0])
  const props={cards:[],entries,favorites:[],historySync:{status:'local' as const,message:''}}
  const host=document.createElement('div'),root=createRoot(host)
  await act(async()=>{root.render(createElement(PriceHistoryPage,props))})
  await act(async()=>{await flushPriceHistory()})
  const values=()=>[...host.querySelectorAll('.price-explorer-values>strong')].map(node=>node.textContent)
  expect(values()).toEqual([expect.stringContaining('150'),expect.stringContaining('20')])
  expect(host.querySelectorAll('.history-insight-grid strong')[2].textContent).toContain('320')
  expect(getAllPriceHistory()).toHaveLength(2)
  await act(async()=>root.render(null))
  await act(async()=>root.render(createElement(PriceHistoryPage,props)))
  expect(values()).toEqual([expect.stringContaining('150'),expect.stringContaining('20')])
  expect(host.textContent).toContain('Moy. 7 j / 30 j')
  act(()=>root.unmount());vi.unstubAllGlobals()
})
