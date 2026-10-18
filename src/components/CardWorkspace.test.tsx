// @vitest-environment jsdom
import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { CardWorkspace } from './CardWorkspace'
import { emptyCollection, upsertEntry } from '../domain/collection'
vi.mock('../hooks/useCardPrices',()=>({useCardPrices:()=>({})}))
vi.mock('./CatalogueImage',()=>({CatalogueImage:()=>null}))
it('opens the editor and preserves personal fields through quantity changes from a favorite',()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1})
 window.scrollTo=vi.fn()
 const card={source:'tcgdex' as const,setId:'jumbo',cardId:'xy-1',language:'fr',variant:'normal',name:'Pikachu Jumbo',setName:'Jumbo'}
 let latest=upsertEntry(emptyCollection(),{...card,quantity:1,condition:'excellent',notes:'Cadeau',manualPrice:45,priceMode:'manual'})
 function Harness(){const [document,setDocument]=useState(latest);latest=document;return <CardWorkspace card={card} document={document} onChange={setDocument} initialView="details" favorite onFavorite={()=>{}} onClose={()=>{}}/>}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 try{
  act(()=>root.render(createElement(Harness)))
  act(()=>document.querySelector<HTMLButtonElement>('button[aria-label="Ajouter un exemplaire"]')!.click())
  expect(latest.entries[0]).toMatchObject({quantity:2,manualPrice:45,priceMode:'manual',notes:'Cadeau',condition:'excellent'})
  act(()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Modifier')!.click())
  expect(document.querySelector('textarea')?.value).toBe('Cadeau')
  expect(document.querySelector<HTMLInputElement>('[aria-label="Mon prix personnalisé en euros"]')?.value).toBe('45')
  expect(document.querySelector<HTMLInputElement>('[aria-label="Quantité"]')?.value).toBe('2')
 }finally{act(()=>root.unmount());host.remove();vi.unstubAllGlobals()}
})
