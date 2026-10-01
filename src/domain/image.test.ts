import {describe,expect,it} from 'vitest'
import {cardImageOverrides} from '../data/cardImageOverrides'
import {isPokemonCardBackUrl,isSamePrinting,resolveCardImage} from './image'
describe('image resolver',()=>{
 it('ne présente aucune impression historique comme visuel 30e',()=>{expect(cardImageOverrides).toHaveLength(30);for(const override of cardImageOverrides){expect(override.verified).toBe(false);const result=resolveCardImage({card:{id:override.cardId,name:override.name,language:'fr'},requestedLanguage:'fr'});expect(result.source).toBe('none');expect(result.url).toBeUndefined()}})
 it('marque un fallback anglais exact',()=>{const result=resolveCardImage({card:{id:'set-1',name:'X',language:'en',image:'https://x'},requestedLanguage:'fr'});expect(result.isFallback).toBe(true);expect(result.language).toBe('en')})
 it('refuse implicitement une autre impression',()=>expect(isSamePrinting({id:'set-1'},{id:'set-2'})).toBe(false))
 it('identifie les URLs connues du dos Pokémon',()=>{expect(isPokemonCardBackUrl('/images/pokemon-card-back.jpg')).toBe(true);expect(isPokemonCardBackUrl('https://images.pokemontcg.io/card-back.png?x=1')).toBe(true);expect(isPokemonCardBackUrl('https://img.example/pikachu/high.webp')).toBe(false)})
 it('refuse le dos comme fallback ou source de recto',()=>{const fallback=resolveCardImage({card:{id:'set-1',name:'X',language:'fr',fallbackImage:{low:'/images/pokemon-card-back.jpg',high:'/images/pokemon-card-back.jpg',source:'Pokémon TCG API'}},requestedLanguage:'fr'});const direct=resolveCardImage({card:{id:'set-2',name:'Y',language:'fr',image:'/images/pokemon-card-back.jpg'},requestedLanguage:'fr'});expect(fallback.url).toBeUndefined();expect(direct.url).toBeUndefined();expect(fallback.source).toBe('none');expect(direct.source).toBe('none')})
})
