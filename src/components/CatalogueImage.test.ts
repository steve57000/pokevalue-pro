import {describe,expect,it} from 'vitest'
import {imageFallbackOrder,resolveCatalogueImage,selectRelatedArtwork} from './CatalogueImage'
const card={id:'xy-1',name:'Carte',localId:'1'}
describe('catalogue image providers',()=>{
 it('normalise JP et ZH en codes de langue TCGdex',()=>{expect(imageFallbackOrder('JP')).toEqual(['ja','en']);expect(imageFallbackOrder('ZH')).toEqual(['zh-tw','en'])})
 it('emploie un TCGdex anglais exact et le signale',async()=>{const image=await resolveCatalogueImage(card,'fr','low',async(id,language)=>({id,name:'Carte',language:language??'fr',image:language==='en'?'https://exact':undefined}));expect(image.url).toBe('https://exact/low.webp');expect(image.isFallback).toBe(true)})
 it('préfère le placeholder à une impression différente',async()=>{const image=await resolveCatalogueImage(card,'fr','low',async()=>({id:'xy-2',name:'Autre',language:'en',image:'https://wrong'}));expect(image.url).toBeUndefined();expect(image.source).toBe('none')})
 it('affiche le placeholder plutôt que le dos Pokémon dans la grille',async()=>{const image=await resolveCatalogueImage(card,'fr','low',async()=>({...card,language:'fr',image:'/images/pokemon-card-back.jpg'}),new Set(),async()=>[]);expect(image.url).toBeUndefined();expect(image.source).toBe('none')})
 it('uses the native Japanese TCGdex scan instead of an English back placeholder',async()=>{const image=await resolveCatalogueImage({...card,id:'sv8a-001'},'ja','low',async(id,language)=>({id,name:'Carte',language:language??'ja',fallbackImage:{low:'https://images.pokemontcg.io/sv8a/1.png',high:'https://images.pokemontcg.io/sv8a/1_hires.png',source:'Pokémon TCG API'}}),new Set(),async()=>[]);expect(image.url).toBe('https://assets.tcgdex.net/ja/sv/sv8a/1/low.webp');expect(image.language).toBe('ja');expect(image.source).toBe('TCGdex')})
 it('conserve le recto natif TCGdex des cartes japonaises',async()=>{const image=await resolveCatalogueImage({...card,id:'sv8a-001'},'ja','low',async(id,language)=>({id,name:'Carte',language:language??'ja',image:language==='ja'?'https://assets.tcgdex.net/ja/sv8a/001':undefined}));expect(image.url).toBe('https://assets.tcgdex.net/ja/sv8a/001/low.webp');expect(image.language).toBe('ja');expect(image.isFallback).toBe(false)})
 it('uses verified Pokellector Japanese Expansion Pack fronts before fallback lookup',async()=>{
  let apiCalls=0
  const image=await resolveCatalogueImage({id:'PMCG1-001',name:'フシギダネ',localId:'001'},'ja','low',async(id,language)=>{apiCalls++;return{id,name:'フシギダネ',localId:'001',language:language??'ja'}})
  expect(image.url).toBe('https://den-cards.pokellector.com/311/Bulbasaur.EXP.1.37251.png')
  expect(image.language).toBe('ja')
  expect(image.isFallback).toBe(false)
  expect(image.source).toBe('local-override')
  expect(apiCalls).toBe(0)
 })
 it('uses official Traditional Chinese SC2D fronts across the full 157-card set',async()=>{
  const cases=[
   ['001','https://asia.pokemon-card.com/tw/card-img/tw00001234.png'],
   ['157','https://asia.pokemon-card.com/tw/card-img/tw00001390.png'],
  ] as const
  let apiCalls=0
  for(const [localId,expectedUrl] of cases){
   const image=await resolveCatalogueImage({id:`SC2D-${localId}`,name:'卡牌',localId},'zh-tw','low',async(id,language)=>{apiCalls++;return{id,name:'卡牌',localId,language:language??'zh-tw'}})
   expect(image.url).toBe(expectedUrl)
   expect(image.language).toBe('zh-tw')
   expect(image.isFallback).toBe(false)
   expect(image.source).toBe('local-override')
  }
  expect(apiCalls).toBe(0)
 })
 it('falls back to the native PMCG Japanese TCGdex scan after an image failure',async()=>{
  const failed='https://den-cards.pokellector.com/311/Bulbasaur.EXP.1.37251.png'
  const image=await resolveCatalogueImage({id:'PMCG1-001',name:'フシギダネ',localId:'001'},'ja','low',async(id,language)=>({id,name:'フシギダネ',localId:'001',language:language??'ja'}),new Set([failed]))
  expect(image.url).toBe('https://assets.tcgdex.net/ja/pmcg/pmcg1/001/low.webp')
  expect(image.language).toBe('ja')
  expect(image.source).toBe('TCGdex')
 })
 it('uses exact Japanese Expansion Pack rectos without waiting on missing TCGdex assets',async()=>{
  const cases=[
   ['001','フシギダネ','https://den-cards.pokellector.com/311/Bulbasaur.EXP.1.37251.png'],
   ['063','カモネギ',"https://den-cards.pokellector.com/311/Farfetchd.EXP.63.37313.png"],
   ['101','エネルギー','https://den-cards.pokellector.com/311/Psychic-Energy.EXP.101.37351.png'],
   ['102','エネルギー','https://den-cards.pokellector.com/311/Fighting-Energy.EXP.102.37352.png'],
  ] as const
  for(const [localId,name,expectedUrl] of cases){
   let apiCalls=0
   const image=await resolveCatalogueImage({id:`base1-${localId}`,name,localId},'ja','low',async(id,language)=>{apiCalls++;return{id,name,localId,language:language??'ja'}})
   expect(image.url).toBe(expectedUrl)
   expect(image.language).toBe('ja')
   expect(image.isFallback).toBe(false)
   expect(image.source).toBe('local-override')
   expect(apiCalls).toBe(0)
  }
 })
 it('resolves Japanese sets using the full swsh prefix',async()=>{
  const image=await resolveCatalogueImage({id:'swsh4a-001',name:'カード',localId:'001'},'ja','low',async(id,language)=>({id,name:'カード',localId:'001',language:language??'ja'}))
  expect(image.url).toBe('https://assets.tcgdex.net/ja/swsh/swsh4a/001/low.webp')
  expect(image.language).toBe('ja')
 })
 it('resolves Traditional Chinese sets using the full swsh prefix',async()=>{
  const image=await resolveCatalogueImage({id:'swsh4-001',name:'卡牌',localId:'001'},'zh-tw','low',async(id,language)=>({id,name:'卡牌',localId:'001',language:language??'zh-tw'}))
  expect(image.url).toBe('https://assets.tcgdex.net/zh-tw/swsh/swsh4/001/low.webp')
  expect(image.language).toBe('zh-tw')
 })
 it('resolves Japanese Mega set scans omitted from the API image field',async()=>{
  const image=await resolveCatalogueImage({id:'M3-001',name:'イトマル',localId:'001'},'ja','low',async(id,language)=>({id,name:'イトマル',localId:'001',language:language??'ja'}))
  expect(image.url).toBe('https://assets.tcgdex.net/ja/me/m3/001/low.webp')
  expect(image.language).toBe('ja')
 })
 it('uses native Traditional Chinese scans when the localized API omits its image field',async()=>{
  const image=await resolveCatalogueImage({id:'sv8a-001',name:'卡牌',localId:'001'},'zh-tw','low',async(id,language)=>({id,name:'卡牌',localId:'001',language:language??'zh-tw'}))
  expect(image.url).toBe('https://assets.tcgdex.net/zh-tw/sv/sv8a/001/low.webp')
  expect(image.language).toBe('zh-tw')
 })
 it('utilise un scan anglais de secours pour une promo MEP sans image TCGdex',async()=>{const image=await resolveCatalogueImage({id:'mep-037',name:'Bulbizarre',localId:'037'},'fr','low',async(id,language)=>({id,name:language==='en'?'Bulbasaur':'Bulbizarre',localId:'037',language:language??'fr'}));expect(image.url).toBe('https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/mep/mep-037_bulbasaur.webp');expect(image.language).toBe('en');expect(image.isFallback).toBe(true)})
 it('préfère le scan promo MEP réel à la fausse image de dos de l’API anglaise',async()=>{const image=await resolveCatalogueImage({id:'mep-003',name:'Alakazam',localId:'003'},'fr','low',async(id,language)=>({id,name:language==='en'?'Alakazam':'Alakazam',localId:'003',language:language??'fr',fallbackImage:{low:'https://images.pokemontcg.io/mep/3.png',high:'https://images.pokemontcg.io/mep/3_hires.png',source:'Pokémon TCG API'}}));expect(image.url).toBe('https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/mep/mep-003_alakazam.webp');expect(image.source).toBe('promo-archive')})
 it('uses parent asset folders for subset cards omitted by the API image manifest',async()=>{
  const cases=[
   ['swsh4.5sv-SV062','swsh/swsh4.5/SV062'],
   ['swsh12.5gg-GG36','swsh/swsh12.5/GG36'],
   ['swsh9.5tg-TG16','swsh/swsh9/TG16'],
   ['swsh10.5tg-TG16','swsh/swsh10/TG16'],
   ['swsh11.5tg-TG16','swsh/swsh11/TG16'],
   ['swsh12.5tg-TG16','swsh/swsh12.5/TG16'],
   ['exu-A','ex/ex10/A'],
   ['svp-196','sv/svp/196'],
   ['P-A-084','tcgp/P-A/084'],
  ] as const
  for(const [id,path] of cases){
   const localId=id.slice(id.lastIndexOf('-')+1)
   const image=await resolveCatalogueImage({id,name:'Carte',localId},'fr','low',async(cardId,language)=>({id:cardId,name:'Carte',localId,language:language??'fr'}))
   expect(image.url).toBe(`https://assets.tcgdex.net/fr/${path}/low.webp`)
   expect(image.source).toBe('TCGdex')
  }
 })
 it('uses a working asset source after an earlier image URL failed',async()=>{
  const failed='https://assets.tcgdex.net/fr/swsh/swsh12.5gg/GG36/low.webp'
  const image=await resolveCatalogueImage({id:'swsh12.5gg-GG36',name:'Entei V',localId:'GG36'},'fr','low',async(id,language)=>({id,name:'Entei V',localId:'GG36',language:language??'fr'}),new Set([failed]))
  expect(image.url).toBe('https://assets.tcgdex.net/fr/swsh/swsh12.5/GG36/low.webp')
 })
 it('falls back from a missing MEP archive scan to the known TCGdex asset path',async()=>{
  const archive='https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/mep/mep-027_haunter.webp'
  const image=await resolveCatalogueImage({id:'mep-027',name:'Spectrum',localId:'027'},'fr','low',async(id,language)=>({id,name:'Haunter',localId:'027',language:language??'fr'}),new Set([archive]))
  expect(image.url).toBe('https://assets.tcgdex.net/en/me/mep/027/low.webp')
  expect(image.language).toBe('en')
 })

 it('falls back to the English print when a TCGdex front URL is broken',async()=>{
  const failed='https://assets.tcgdex.net/fr/swsh/swsh3/1/low.webp'
  const image=await resolveCatalogueImage({id:'swsh3-1',name:'Carte',localId:'1'},'fr','low',async(id,language)=>({id,name:'Carte',language:language??'fr',image:'https://assets.tcgdex.net/fr/swsh/swsh3/1',fallbackImage:{low:'https://images.pokemontcg.io/swsh3/1.png',high:'https://images.pokemontcg.io/swsh3/1_hires.png',source:'Pokémon TCG API'}}),new Set([failed]),async()=>[])
  expect(image.url).toBe('https://images.pokemontcg.io/swsh3/1.png')
  expect(image.isFallback).toBe(true)
 })

it('uses a same-era front scan for McDonald’s cards when the set has no scan',async()=>{
  const card={id:'2023sv-1',name:'Sprigatito',localId:'1'}
  const image=await resolveCatalogueImage(card,'fr','low',async(id,language)=>({id,name:'Sprigatito',localId:'1',language:language??'fr'}),new Set(),async()=>[
   {id:'swsh1-1',name:'Sprigatito',image:'https://assets.tcgdex.net/en/swsh/swsh1/1'},
   {id:'sv1-1',name:'Sprigatito',image:'https://assets.tcgdex.net/en/sv/sv1/1'},
  ])
  expect(image.url).toBe('https://assets.tcgdex.net/en/sv/sv1/1/low.webp')
  expect(image.language).toBe('en')
  expect(image.isFallback).toBe(true)
 })
 it('skips a related scan that already failed',()=>{
  const image=selectRelatedArtwork([
   {id:'sv1-1',name:'Sprigatito',image:'https://assets.tcgdex.net/en/sv/sv1/1'},
   {id:'sv2-1',name:'Sprigatito',image:'https://assets.tcgdex.net/en/sv/sv2/1'},
  ],'2023sv',new Set(['https://assets.tcgdex.net/en/sv/sv1/1/low.webp']))
  expect(image?.id).toBe('sv2-1')
 })
it('uses a name-matched front scan for other sets with no direct image',async()=>{
  const image=await resolveCatalogueImage({id:'dp1-1',name:'Bulbizarre',localId:'1'},'fr','low',async(id,language)=>({id,name:'Bulbasaur',localId:'1',language:language??'fr'}),new Set(),async()=>[
   {id:'base1-1',name:'Bulbasaur',image:'https://assets.tcgdex.net/en/base/base1/1'},
  ])
  expect(image.url).toBe('https://assets.tcgdex.net/en/base/base1/1/low.webp')
  expect(image.isFallback).toBe(true)
 })
})