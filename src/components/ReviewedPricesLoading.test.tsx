// @vitest-environment jsdom
import {act,createElement} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
import {useCardPrices} from '../hooks/useCardPrices'
import {tcgDexProvider} from '../api/tcgdex'
import {getAllPriceHistory} from '../domain/priceHistory'
vi.mock('../api/tcgdex',()=>({tcgDexProvider:{getCard:vi.fn(async()=>{throw Error('Offline')})}}))
function Prices(){
 const fr=useCardPrices(['me06-138'],'fr'),en=useCardPrices(['me06-138'],'en')
 return createElement('p',null,`${fr['me06-138']?.price?.value}|${en['me06-138']?.price?.value}`)
}
it('loads reviewed FR and EN prices without network and preserves the dated source across navigation',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 localStorage.clear()
 const host=document.createElement('div'),root=createRoot(host)
 await act(async()=>root.render(createElement(Prices)))
 expect(host.textContent).toBe('430|245.81')
 expect(tcgDexProvider.getCard).not.toHaveBeenCalled()
 expect(getAllPriceHistory().map(point=>[point.language,point.date,point.basis])).toEqual([['en','2026-11-23','listing'],['fr','2026-11-23','listing']])
 await act(async()=>root.render(null))
 await act(async()=>root.render(createElement(Prices)))
 expect(host.textContent).toBe('430|245.81')
 expect(getAllPriceHistory()).toHaveLength(2)
 act(()=>root.unmount())
})
