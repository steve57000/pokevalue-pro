import {describe,expect,it} from 'vitest'
import {isSamePrinting,resolveCardImage} from './image'
describe('image resolver',()=>{it('marque un fallback anglais exact',()=>{const result=resolveCardImage({card:{id:'set-1',name:'X',language:'en',image:'https://x'},requestedLanguage:'fr'});expect(result.isFallback).toBe(true);expect(result.language).toBe('en')});it('refuse implicitement une autre impression',()=>expect(isSamePrinting({id:'set-1'},{id:'set-2'})).toBe(false))})
