import {describe,expect,it} from 'vitest'
import {collectionValue} from './CardDetailsModal'
describe('valeur collection',()=>{it('utilise le prix automatique fois quantité',()=>expect(collectionValue({quantity:3},10)).toBe(30));it('préfère le prix manuel fois quantité',()=>expect(collectionValue({quantity:2,manualPrice:20},10)).toBe(40));it('revient au prix marché quand le mode marché est choisi',()=>expect(collectionValue({quantity:2,manualPrice:20,priceMode:'market'},10)).toBe(20));it('utilise le prix manuel sans prix automatique',()=>expect(collectionValue({quantity:2,manualPrice:20})).toBe(40))})

import {currentCollectionPrice} from './PriceHistoryExplorer'

describe('prix manuel dans les statistiques de collection',()=>{
 const base={key:'key',source:'tcgdex' as const,setId:'sv1',cardId:'sv1-001',language:'fr',variant:'normal',name:'Dracaufeu',setName:'Extension',quantity:1,condition:'near-mint' as const,notes:'',updatedAt:'2026-01-01T00:00:00.000Z'}
 it('utilise le prix manuel à la place du relevé marché',()=>expect(currentCollectionPrice(179.18,[{...base,manualPrice:165,priceMode:'manual'}])).toEqual({value:165,manual:true}))
 it('calcule la moyenne pondérée pour plusieurs exemplaires',()=>expect(currentCollectionPrice(100,[{...base,manualPrice:80,priceMode:'manual',quantity:1},{...base,cardId:'sv1-002',priceMode:'market',quantity:3}])).toEqual({value:95,manual:true}))
 it('conserve le prix marché si le mode marché est sélectionné',()=>expect(currentCollectionPrice(12,[{...base,manualPrice:8,priceMode:'market'}])).toEqual({value:12,manual:false}))
 it('ignore les exemplaires supprimés',()=>expect(currentCollectionPrice(12,[{...base,manualPrice:8,quantity:0}])).toEqual({value:12,manual:false}))
})
