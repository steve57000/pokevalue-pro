import {describe,expect,it} from 'vitest'
import {resolveCatalogueImage} from './CatalogueImage'
const card={id:'xy-1',name:'Carte',localId:'1'}
describe('catalogue image providers',()=>{
 it('emploie un TCGdex anglais exact et le signale',async()=>{const image=await resolveCatalogueImage(card,'fr','low',async(id,language)=>({id,name:'Carte',language:language??'fr',image:language==='en'?'https://exact':undefined}));expect(image.url).toBe('https://exact/low.webp');expect(image.isFallback).toBe(true)})
 it('préfère le placeholder à une impression différente',async()=>{const image=await resolveCatalogueImage(card,'fr','low',async()=>({id:'xy-2',name:'Autre',language:'en',image:'https://wrong'}));expect(image.url).toBeUndefined();expect(image.source).toBe('none')})
 it('affiche le placeholder plutôt que le dos Pokémon dans la grille',async()=>{const image=await resolveCatalogueImage(card,'fr','low',async()=>({...card,language:'fr',image:'/images/pokemon-card-back.jpg'}));expect(image.url).toBeUndefined();expect(image.source).toBe('none')})
 it('ne montre pas le faux dos anglais comme recto des cartes japonaises',async()=>{const image=await resolveCatalogueImage({...card,id:'sv8a-001'},'ja','low',async(id,language)=>({id,name:'Carte',language:language??'ja',fallbackImage:{low:'https://images.pokemontcg.io/sv8a/1.png',high:'https://images.pokemontcg.io/sv8a/1_hires.png',source:'Pokémon TCG API'}}));expect(image.url).toBeUndefined();expect(image.source).toBe('none')})
 it('conserve le recto natif TCGdex des cartes japonaises',async()=>{const image=await resolveCatalogueImage({...card,id:'sv8a-001'},'ja','low',async(id,language)=>({id,name:'Carte',language:language??'ja',image:language==='ja'?'https://assets.tcgdex.net/ja/sv8a/001':undefined}));expect(image.url).toBe('https://assets.tcgdex.net/ja/sv8a/001/low.webp');expect(image.language).toBe('ja');expect(image.isFallback).toBe(false)})
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
  const image=await resolveCatalogueImage({id:'swsh3-1',name:'Carte',localId:'1'},'fr','low',async(id,language)=>({id,name:'Carte',language:language??'fr',image:'https://assets.tcgdex.net/fr/swsh/swsh3/1',fallbackImage:{low:'https://images.pokemontcg.io/swsh3/1.png',high:'https://images.pokemontcg.io/swsh3/1_hires.png',source:'Pokémon TCG API'}}),new Set([failed]))
  expect(image.url).toBe('https://images.pokemontcg.io/swsh3/1.png')
  expect(image.isFallback).toBe(true)
 })

})