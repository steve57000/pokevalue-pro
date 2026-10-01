import {describe,expect,it} from 'vitest'
import {normalizeSearch,sortCatalogueCards} from './catalogue'
import type {PriceState} from './catalogue'
const cards=[{id:'a',name:'Z',localId:'2'},{id:'b',name:'A',localId:'1'},{id:'c',name:'C',localId:'3'}]
const prices:Record<string,PriceState>={a:{status:'success',price:{value:20,currency:'EUR',label:'Prix moyen',provider:'cardmarket'},language:'fr'} as PriceState,b:{status:'success',price:{value:10,currency:'EUR',label:'Prix moyen',provider:'cardmarket'},language:'fr'} as PriceState,c:{status:'success',price:null,language:'fr'} as PriceState}
describe('catalogue',()=>{it('normalise une recherche accentuée',()=>expect(normalizeSearch('Méga')).toBe('mega'));it('trie les prix dans les deux sens et garde les absents à la fin',()=>{expect(sortCatalogueCards(cards,'price-asc',prices,new Map()).map(x=>x.id)).toEqual(['b','a','c']);expect(sortCatalogueCards(cards,'price-desc',prices,new Map()).map(x=>x.id)).toEqual(['a','b','c'])})})
