import {describe,expect,it} from 'vitest'
import {cardImageOverrides} from '../data/cardImageOverrides'
import {isSamePrinting,resolveCardImage} from './image'
describe('image resolver',()=>{
 it('ne présente aucune impression historique comme visuel 30e',()=>{expect(cardImageOverrides).toHaveLength(30);for(const override of cardImageOverrides){expect(override.verified).toBe(false);const result=resolveCardImage({card:{id:override.cardId,name:override.name,language:'fr'},requestedLanguage:'fr'});expect(result.source).toBe('none');expect(result.url).toBeUndefined()}})
 it('marque un fallback anglais exact',()=>{const result=resolveCardImage({card:{id:'set-1',name:'X',language:'en',image:'https://x'},requestedLanguage:'fr'});expect(result.isFallback).toBe(true);expect(result.language).toBe('en')})
 it('refuse implicitement une autre impression',()=>expect(isSamePrinting({id:'set-1'},{id:'set-2'})).toBe(false))
})
