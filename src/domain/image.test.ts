import {describe,expect,it} from 'vitest'
import {cardImageOverrides} from '../data/cardImageOverrides'
import {isSamePrinting,resolveCardImage} from './image'
describe('image resolver',()=>{
 it('résout les 30 impressions 30th-c par identifiant exact',()=>{expect(cardImageOverrides).toHaveLength(30);for(const override of cardImageOverrides){const result=resolveCardImage({card:{id:override.cardId,name:override.name,language:'fr'},requestedLanguage:'fr'});expect(result.source).toBe('local-override');expect(result.url).toContain(override.cardId.slice(-3))}})
 it('marque un fallback anglais exact',()=>{const result=resolveCardImage({card:{id:'set-1',name:'X',language:'en',image:'https://x'},requestedLanguage:'fr'});expect(result.isFallback).toBe(true);expect(result.language).toBe('en')})
 it('refuse implicitement une autre impression',()=>expect(isSamePrinting({id:'set-1'},{id:'set-2'})).toBe(false))
})
