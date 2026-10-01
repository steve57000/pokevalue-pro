import {describe,expect,it} from 'vitest'
import {collectionValue} from './CardDetailsModal'
describe('valeur collection',()=>{it('utilise le prix automatique fois quantité',()=>expect(collectionValue({quantity:3},10)).toBe(30));it('préfère le prix manuel fois quantité',()=>expect(collectionValue({quantity:2,manualPrice:20},10)).toBe(40));it('utilise le prix manuel sans prix automatique',()=>expect(collectionValue({quantity:2,manualPrice:20})).toBe(40))})
