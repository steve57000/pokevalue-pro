import {describe,expect,it} from 'vitest'
import {cardImageOverrides,cardImageOverrideById} from '../data/cardImageOverrides'
import {buildCardAssetCandidates,buildCardAssetUrl,buildMepPromoImage,isPokemonCardBackUrl,isSamePrinting,normalizeImageLanguage,resolveCardImage} from './image'
describe('image resolver',()=>{
 it('normalise les codes de langue de l’interface avant de résoudre les images',()=>{expect(normalizeImageLanguage('JP')).toBe('ja');expect(normalizeImageLanguage('JA')).toBe('ja');expect(normalizeImageLanguage('ZH')).toBe('zh-tw');expect(normalizeImageLanguage('zh-TW')).toBe('zh-tw');expect(normalizeImageLanguage('EN')).toBe('en');expect(normalizeImageLanguage('FR')).toBe('fr')})
 it('construit un asset de carte depuis la racine du catalogue sans doubler une extension',()=>{
  expect(buildCardAssetUrl('https://assets.tcgdex.net/ja/sv/sv8a/001','low')).toBe('https://assets.tcgdex.net/ja/sv/sv8a/001/low.webp')
  expect(buildCardAssetUrl('https://assets.tcgdex.net/en/sv/sv1/1/high.png','low')).toBe('https://assets.tcgdex.net/en/sv/sv1/1/high.png')
  expect(buildCardAssetCandidates('https://assets.tcgdex.net/zh-tw/sv/sv8a/001','low')).toEqual([
   'https://assets.tcgdex.net/zh-tw/sv/sv8a/001/low.webp',
   'https://assets.tcgdex.net/zh-tw/sv/sv8a/001/low.png',
   'https://assets.tcgdex.net/zh-tw/sv/sv8a/001/high.webp',
   'https://assets.tcgdex.net/zh-tw/sv/sv8a/001/high.png',
  ])
 })
 it('déduit la langue visuelle de l’URL TCGdex au lieu de la langue du catalogue',()=>{
  const image=resolveCardImage({card:{id:'sv8a-001',name:'Carte',language:'ja',image:'https://assets.tcgdex.net/en/sv/sv8a/001'},requestedLanguage:'ja'})
  expect(image.url).toBe('https://assets.tcgdex.net/en/sv/sv8a/001/low.webp')
  expect(image.language).toBe('en')
  expect(image.isFallback).toBe(true)
 })
 it('utilise les scans vérifiés des 30 réimpressions Classic Collection',()=>{expect(cardImageOverrides).toHaveLength(34);for(const override of cardImageOverrides){expect(override.verified).toBe(true);const result=resolveCardImage({card:{id:override.cardId,name:override.name,language:'fr'},requestedLanguage:'fr'});expect(result.source).toBe('local-override');expect(result.language).toBe('en');expect(result.isFallback).toBe(true);expect(result.url).toMatch(/^https:\/\/bills-archive\.nyc3\.cdn\.digitaloceanspaces\.com\/tcgdex_cards\/.+\.webp$/)}})
 it.each([['30th-R','R','red','fr','Mew'],['30th-G','G','green','en','Mew'],['30th-B','B','blue','en','Mew'],['M6a-R','R','red','fr','ミュウ'],['M6a-G','G','green','en','ミュウ'],['M6a-B','B','blue','en','ミュウ']])('résout le visuel réel du Mew RGB %s', (id,localId,color,visualLanguage,name)=>{const result=resolveCardImage({card:{id,localId,name,setName:'30th Celebration',language:'fr'},requestedLanguage:'fr'});expect(result.url).toContain(`rgb-mew-${color}.webp`);expect(result.language).toBe(visualLanguage);expect(result.isFallback).toBe(visualLanguage!=='fr')})
 it('essaie le format suivant du même visuel après un échec de chargement',()=>{
  const root='https://assets.tcgdex.net/zh-tw/sv/sv8a/001'
  const result=resolveCardImage({card:{id:'sv8a-1',name:'Carte',language:'zh-tw',image:root},requestedLanguage:'zh-tw',rejectedUrls:new Set([root+'/low.webp'])})
  expect(result.url).toBe(root+'/low.png')
  expect(result.language).toBe('zh-tw')
  expect(result.isFallback).toBe(false)
 })
 it('marque un fallback anglais exact',()=>{const result=resolveCardImage({card:{id:'set-1',name:'X',language:'en',image:'https://x'},requestedLanguage:'fr'});expect(result.isFallback).toBe(true);expect(result.language).toBe('en')})
 it('refuse implicitement une autre impression',()=>expect(isSamePrinting({id:'set-1'},{id:'set-2'})).toBe(false))
 it('identifie les URLs connues du dos Pokémon',()=>{expect(isPokemonCardBackUrl('/images/pokemon-card-back.jpg')).toBe(true);expect(isPokemonCardBackUrl('https://images.pokemontcg.io/card-back.png?x=1')).toBe(true);expect(isPokemonCardBackUrl('https://img.example/pikachu/high.webp')).toBe(false)})
 it('construit un visuel de secours ciblé pour une promo MEP anglaise',()=>{expect(buildMepPromoImage({id:'mep-037',localId:'037',name:'Bulbasaur'})).toBe('https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/mep/mep-037_bulbasaur.webp');expect(buildMepPromoImage({id:'sv1-1',localId:'1',name:'Bulbasaur'})).toBeUndefined()})
 it('refuse le dos comme fallback ou source de recto',()=>{const fallback=resolveCardImage({card:{id:'set-1',name:'X',language:'fr',fallbackImage:{low:'/images/pokemon-card-back.jpg',high:'/images/pokemon-card-back.jpg',source:'Pokémon TCG API'}},requestedLanguage:'fr'});const direct=resolveCardImage({card:{id:'set-2',name:'Y',language:'fr',image:'/images/pokemon-card-back.jpg'},requestedLanguage:'fr'});expect(fallback.url).toBeUndefined();expect(direct.url).toBeUndefined();expect(fallback.source).toBe('none');expect(direct.source).toBe('none')})
 it.each([
  ['mep-096','moltres'],['mep-097','articuno'],['mep-099','greninja-ex'],['mep-101','nidorina'],
 ])('maps French anniversary promo %s to its matching front scan', (cardId,slug)=>{
  const override=cardImageOverrideById.get(cardId)
  expect(override?.verified).toBe(true)
  expect(override?.image?.verified).toBe(true)
  expect(override?.image?.localPath).toBe(`https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/mep/${cardId}_${slug}.webp`)
 })
 it.each(Array.from({length:16},(_,index)=>index+1))('résout le recto vérifié de l’énergie Méga-Évolution %s',number=>{
  const result=resolveCardImage({card:{id:`mee-${number}`,localId:String(number),name:'Énergie de base',language:'fr',image:'https://assets.tcgdex.net/card-back'},requestedLanguage:'fr'})
  expect(result.source).toBe('local-override')
  expect(result.isFallback).toBe(false)
  expect(result.url).toContain(`Carte_M%C3%A9ga-%C3%89volution_%C3%89nergie_de_base_${String(number).padStart(3,'0')}.png`)
 })

 it('prefers an exact catalogue-language scan over an English local override',()=>{
  const result=resolveCardImage({card:{id:'30th-c-001',name:'Dracaufeu',language:'ja',image:'https://assets.tcgdex.net/ja/sv/sv9/001'},requestedLanguage:'ja'})
  expect(result.url).toBe('https://assets.tcgdex.net/ja/sv/sv9/001/low.webp')
  expect(result.language).toBe('ja')
  expect(result.isFallback).toBe(false)
 })

})