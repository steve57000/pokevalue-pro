// @vitest-environment jsdom
import {act} from 'react'
import {createRoot} from 'react-dom/client'
import {afterEach,expect,it,vi} from 'vitest'
import {CardShowcase,visibleCardFace} from './CardShowcase'
vi.mock('./CatalogueImage',()=>({CatalogueImage:({card}:{card:{name:string}})=><span>Recto {card.name}</span>}))
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks()})
it('returns to the front after a manual rotation and resets when the card changes',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 const render=(id:string)=>root.render(<CardShowcase card={{id,name:id,localId:'1'}} setName="Test" requestedLanguage="fr" owned={false} onToggle={()=>{}} onClose={()=>{}}/>)
 await act(async()=>render('test-1'))
 const card=document.querySelector('.showcase-card') as HTMLDivElement
 card.setPointerCapture=vi.fn()
 const pointer=(type:string,x:number)=>{const event=new MouseEvent(type,{bubbles:true,clientX:x,clientY:10});Object.defineProperty(event,'pointerId',{value:1});card.dispatchEvent(event)}
 act(()=>{pointer('pointerdown',10);pointer('pointerup',287)})
 expect(card.dataset.facing).toBe('back')
 const flip=document.querySelector('.showcase-flip') as HTMLButtonElement
 expect(flip.textContent).toBe('Voir le recto')
 act(()=>flip.click())
 expect(card.dataset.facing).toBe('front')
 expect(card.style.transform).toBe('rotateX(0deg) rotateY(0deg)')
 act(()=>flip.click())
 expect(card.dataset.facing).toBe('back')
 await act(async()=>render('test-2'))
 expect(card.dataset.facing).toBe('front')
 expect(flip.textContent).toBe('Voir le verso')
 act(()=>root.unmount())
})
it('identifies the visible face for both axes and full turns',()=>{
 expect(visibleCardFace({x:0,y:180},'front')).toBe('back')
 expect(visibleCardFace({x:180,y:0},'front')).toBe('back')
 expect(visibleCardFace({x:180,y:180},'front')).toBe('front')
 expect(visibleCardFace({x:0,y:360},'front')).toBe('front')
 expect(visibleCardFace({x:0,y:0},'back')).toBe('back')
})
