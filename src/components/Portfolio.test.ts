import {describe,expect,it} from 'vitest'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {CollectionQuantityStepper,effectiveCollectionColumns,maxCollectionColumns,minCollectionColumns,seriesLogoSources,setLogoSources} from './Portfolio'
describe('collection density',()=>{
 it.each([[339,1],[340,2],[639,2],[640,3],[899,3],[900,4],[1199,4],[1200,5],[1920,5]])('limits %ipx to %i columns',(width,columns)=>expect(maxCollectionColumns(width)).toBe(columns))
 it.each([[1,339],[1,340],[1,639],[2,640],[2,899],[3,900],[3,1199],[3,1200]])('requires at least %i columns at %ipx',(columns,width)=>expect(minCollectionColumns(width)).toBe(columns))
 it('clamps preferences to the screen while preserving the saved preference',()=>{const preference=5;expect(effectiveCollectionColumns(preference,390)).toBe(2);expect(effectiveCollectionColumns(preference,1280)).toBe(5);expect(effectiveCollectionColumns(1,390)).toBe(1);expect(effectiveCollectionColumns(1,900)).toBe(3)})
 it.each([3,4,5])('honours desktop preference %i when it fits',columns=>expect(effectiveCollectionColumns(columns,1920)).toBe(columns))
 it('does not render a quantity stepper before a card is owned',()=>expect(renderToStaticMarkup(createElement(CollectionQuantityStepper,{cardName:'Pikachu',flash:false,onDecrement:()=>{},onIncrement:()=>{}}))).toBe(''))
})

describe('series logos',()=>{
 it('restores known French expansion logos by stable catalogue IDs',()=>{
  expect(setLogoSources('me05','me',undefined,undefined,'Nom quelconque','fr')[0]).toBe('https://www.pokepedia.fr/images/thumb/6/67/Logo_Méga-%C3%89volution_Nuit_Noire_JCC.png/800px-Logo_Méga-%C3%89volution_Nuit_Noire_JCC.png')
  expect(setLogoSources('30th','30th',undefined,undefined,'Nom quelconque','fr')[0]).toBe('https://www.pokepedia.fr/images/thumb/0/0c/Logo_30e_Anniversaire_JCC.png/800px-Logo_30e_Anniversaire_JCC.png')
  const classicSources=setLogoSources('30th-c','30th',undefined,undefined,'Collection Classique','fr')
  expect(classicSources[classicSources.length-1]).toBe('https://www.pokepedia.fr/images/thumb/0/0c/Logo_30e_Anniversaire_JCC.png/800px-Logo_30e_Anniversaire_JCC.png')
  expect(setLogoSources('me05','me',undefined,undefined,'Nom quelconque','zh-tw')[0]).toBe('https://www.pokepedia.fr/images/thumb/6/67/Logo_Méga-%C3%89volution_Nuit_Noire_JCC.png/800px-Logo_Méga-%C3%89volution_Nuit_Noire_JCC.png')
 })
 it('restores the French 30th anniversary series logo by stable series ID',()=>{
  expect(seriesLogoSources('30th',undefined,'fr')[0]).toBe('https://www.pokepedia.fr/images/thumb/0/0c/Logo_30e_Anniversaire_JCC.png/800px-Logo_30e_Anniversaire_JCC.png')
  expect(seriesLogoSources('30th',undefined,'ja')[0]).toBe('https://www.pokepedia.fr/images/thumb/0/0c/Logo_30e_Anniversaire_JCC.png/800px-Logo_30e_Anniversaire_JCC.png')
  expect(seriesLogoSources('me',undefined,'fr')[0]).toBe('https://www.pokepedia.fr/images/thumb/8/83/Logo_Méga-%C3%89volution_JCC.png/800px-Logo_Méga-%C3%89volution_JCC.png')
  expect(seriesLogoSources('other-series',undefined,'fr')).toEqual([])
 })
 it('uses a dedicated stable logo when the API does not provide one',()=>expect(setLogoSources('mep','me',undefined,undefined,'MEP Black Star Promos')[0]).toBe('https://data.eyevo.app/eyevo/logos/sets/mep.png'))
 it('uses a matching English family logo as an Asian fallback after the local logo',()=>{
  const english='https://assets.tcgdex.net/en/sv/sv01/logo.png'
  const local='https://assets.tcgdex.net/ja/SV/SV5a/logo'
  const localSources=setLogoSources('SV5a','SV',local,undefined,'スカーレット','ja',english)
  expect(localSources[0]).toBe(local+'.png')
  const fallbackSources=setLogoSources('SV9','SV',undefined,undefined,'スノーハザード','ja',english)
  expect(fallbackSources).toContain(english)
  expect(setLogoSources('SV9','SV',undefined,undefined,'スノーハザード','en',english)).toEqual([])
 })
 it('puts the catalogue-supplied logo before its case-normalized path',()=>{
  const exact='https://assets.tcgdex.net/ja/SV/SV5a/logo'
  const urls=setLogoSources('SV5a','SV',exact,'https://assets.tcgdex.net/univ/sv/sv5a/symbol','緋紅薄霧','ja','https://assets.tcgdex.net/en/sv/sv01/logo')
  expect(urls.slice(0,2)).toEqual([exact+'.png',exact+'.webp'])
  expect(urls).toContain('https://assets.tcgdex.net/ja/sv/sv5a/logo.png')
  expect(urls).not.toContain('https://assets.tcgdex.net/univ/sv/sv5a/symbol.png')
  expect(urls).not.toContain('https://assets.tcgdex.net/en/sv/sv01/logo.png')
 })
 it.each([['S1H','S','無極力量','zh-tw'],['M6a','ME','30th CELEBRATION','ja']] as const)('does not invent logo paths for catalogue-only set %s',(setId,seriesId,name,language)=>{
  const urls=setLogoSources(setId,seriesId,undefined,undefined,name,language)
  expect(urls).toEqual([])
 })
 it('uses a curated logo only for an explicitly listed French set ID',()=>{
  expect(setLogoSources('mep','me',undefined,undefined,'Nom libre','fr')[0]).toBe('https://data.eyevo.app/eyevo/logos/sets/mep.png')
  expect(setLogoSources('mep','me',undefined,undefined,'MEP Black Star Promos','en')).toEqual([])
  expect(setLogoSources('me01','me',undefined,undefined,'Nom quelconque','fr')[0]).toBe('https://www.pokepedia.fr/images/thumb/8/83/Logo_Méga-%C3%89volution_JCC.png/800px-Logo_Méga-%C3%89volution_JCC.png')
 })
 it('normalizes logo path casing without guessing another series prefix',()=>{
  const source='https://assets.tcgdex.net/ja/S/S1H/logo'
  const urls=setLogoSources('S1H','S',source,undefined,'無極力量','ja')
  expect(urls).toContain('https://assets.tcgdex.net/ja/s/s1h/logo.png')
  expect(urls.some(url=>url.includes('/ja/swsh/'))).toBe(false)
 })
 it('keeps a catalogue logo first for a set with a similar name',()=>{
  const logo='https://assets.tcgdex.net/fr/me/me01/logo'
  const urls=setLogoSources('me01','me',logo,undefined,'Mega Evolution','fr')
  expect(urls[0]).toBe(logo+'.png')
 })
})
