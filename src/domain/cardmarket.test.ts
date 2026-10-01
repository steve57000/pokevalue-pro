import {describe,expect,it} from 'vitest'
import {buildCardmarketUrl} from './cardmarket'

describe('buildCardmarketUrl',()=>{
 it('uses a verified direct URL when supplied by the manifest',async()=>{const data=await import('../data/cardImageOverrides');const item=data.cardImageOverrides[0];const previous=item.cardmarket;(item as any).cardmarket={...previous,directUrl:'https://www.cardmarket.com/exact'};expect(buildCardmarketUrl({id:item.cardId,name:item.name})).toBe('https://www.cardmarket.com/exact');(item as any).cardmarket=previous})
 it.each([['30th-c-001','Charizard','4%2F102'],['30th-c-007','Sneasel','25%2F111'],['30th-c-008','Pikachu%20%26%20Zekrom-GX','33%2F181'],['30th-c-014','Pikachu','58%2F102'],['30th-c-018','Gastly','94%2F102'],['30th-c-029','Lugia','149%2F147'],['30th-c-030','Magikarp','203%2F193']])('uses the 30C identity for %s',(id,name,number)=>{const url=buildCardmarketUrl({id,name:'nom français',localId:id.slice(-3),setName:'Collection Classique30e Anniversaire'});expect(url).toContain(name);expect(url).toContain(number);expect(url).toContain('30C');expect(url).not.toContain(id.slice(-3)+'%2F030');expect(url).not.toContain('Collection')})
 it('builds a clean encoded fallback',()=>expect(buildCardmarketUrl({name:'Darkrai & Cresselia LÉGENDE',localId:'99/102',setName:'Long set'})).toBe('https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=Darkrai%20%26%20Cresselia%20L%C3%89GENDE%2099%2F102'))
 it('prefers an English name when provided',()=>expect(decodeURIComponent(buildCardmarketUrl({name:'Magicarpe',englishName:'Magikarp',printedNumber:'203/193'}))).toContain('Magikarp 203/193'))
})
