// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PriceHistoryPage } from './PriceHistoryPage'
import { emptyCollection, upsertEntry } from '../domain/collection'
import { recordPriceSnapshots, snapshotsFromQuotes } from '../domain/priceHistory'
import { collectMarketPriceQuotes } from '../domain/pricing'

vi.mock('../hooks/useCardPrices', () => ({useCardPrices: () => ({}), refreshCardPrices: vi.fn()}))
vi.mock('./CatalogueImage', () => ({CatalogueImage: ({card}:{card:{name:string}}) => createElement('img', {alt:card.name})}))
let root: Root, host: HTMLDivElement
const entries = ['Dracaufeu', 'Magicarpe'].map((name,i)=>upsertEntry(emptyCollection(),{source:'tcgdex',setId:'30th-c',cardId:`30th-c-${i+1}`,language:'fr',variant:'normal',name,setName:'Collection Classique',quantity:1,condition:'mint',notes:'',manualPrice:30+i}).entries[0])
const props = {cards:[],entries,favorites:[],historySync:{status:'local' as const,message:''}}
const page = () => createElement(PriceHistoryPage,props)
const names = () => [...host.querySelectorAll('.price-explorer-row>span:first-child>strong')].map(node=>node.textContent)
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 localStorage.clear();sessionStorage.clear()
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1})
 vi.stubGlobal('matchMedia',()=>({matches:false}))
 HTMLElement.prototype.scrollIntoView=vi.fn()
 host=document.createElement('div');document.body.append(host);root=createRoot(host)
})
afterEach(()=>{act(()=>root.unmount());host.remove();vi.unstubAllGlobals()})
describe('statistics navigation',()=>{
 it('keeps the same owned cards, filters and selection after navigation and asynchronous price updates',()=>{
  act(()=>root.render(page()))
  expect(names()).toEqual(['Dracaufeu','Magicarpe'])
  const magicarpe=host.querySelectorAll<HTMLButtonElement>('.price-explorer-row')[1]
  act(()=>magicarpe.click())
  expect(host.querySelector('.history-detail-card h2')?.textContent).toBe('Magicarpe')
  expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  expect(document.activeElement).toBe(host.querySelector('.history-detail-card'))
  act(()=>root.render(null))
  act(()=>recordPriceSnapshots(snapshotsFromQuotes('unrelated-1',collectMarketPriceQuotes({cardmarket:{trend:999}},'fr'))))
  act(()=>root.render(page()))
  expect(names()).toEqual(['Dracaufeu','Magicarpe'])
  expect(host.querySelector('.history-detail-card h2')?.textContent).toBe('Magicarpe')
  expect(host.querySelector('.history-current-price strong')?.textContent).toContain('31')
  expect(host.querySelectorAll('select')).toHaveLength(1) // Only the movement filter, no competing card list.
 })
 it('shows true collection counts and never chooses a promotional card for an empty collection',()=>{
  act(()=>root.render(createElement(PriceHistoryPage,{...props,entries:[]})))
  expect(host.textContent).toContain('Ta collection est vide')
  expect(host.querySelector('.history-detail-card')).toBeNull()
  expect(host.querySelectorAll('.history-insight-grid strong')[0].textContent).toBe('0')
 })
 it('keeps unpriced owned cards visible and distinguishes unknown from a personal zero',()=>{
  act(()=>root.render(createElement(PriceHistoryPage,{...props,entries:[{...entries[0],manualPrice:0},{...entries[1],manualPrice:undefined}]})))
  expect(names()).toEqual(['Dracaufeu','Magicarpe'])
  expect(host.textContent).toContain('1/2 valorisées')
  expect(host.textContent).toContain('1 sans prix')
  act(()=>host.querySelectorAll<HTMLInputElement>('input[type=checkbox]')[1].click())
  expect(names()).toEqual(['Magicarpe'])
  act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Réinitialiser les filtres')!.click())
  expect(names()).toEqual(['Dracaufeu','Magicarpe'])
 })
})
