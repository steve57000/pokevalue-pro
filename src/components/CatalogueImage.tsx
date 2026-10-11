import {useEffect,useRef,useState} from 'react'
import type {SetCard} from '../api/sets'
import {tcgDexProvider} from '../api/tcgdex'
import {buildMepPromoImage,normalizeImageLanguage,resolveCardImage,setIdFromCardId,type ResolvedCardImage} from '../domain/image'
import type {ExternalCard} from '../domain/cards'
type Props={card:SetCard;quality?:'low'|'high';className?:string;requestedLanguage?:string}
type CacheEntry={status:'pending'|'resolved'|'missing';promise?:Promise<ResolvedCardImage>;image?:ResolvedCardImage;expiresAt?:number}
const imageCache=new Map<string,CacheEntry>()
export const imageFallbackOrder=(requested:string)=>{const language=normalizeImageLanguage(requested);return language==='fr'?['fr','en']:language==='en'?['en','fr']:language==='ja'?['ja','en']:['zh-tw','en']}
const japaneseBaseExpansionNames=([
 'Bulbasaur',
 'Caterpie',
 'Metapod',
 'Weedle',
 'Nidoran♂',
 'Koffing',
 'Tangela',
 'Ivysaur',
 'Kakuna',
 'Nidorino',
 'Venusaur',
 'Beedrill',
 'Nidoking',
 'Charmander',
 'Vulpix',
 'Ponyta',
 'Charmeleon',
 'Growlithe',
 'Arcanine',
 'Magmar',
 'Charizard',
 'Ninetales',
 'Squirtle',
 'Poliwag',
 'Staryu',
 'Starmie',
 'Wartortle',
 'Poliwhirl',
 'Seel',
 'Dewgong',
 'Magikarp',
 'Blastoise',
 'Poliwrath',
 'Gyarados',
 'Pikachu',
 'Magnemite',
 'Voltorb',
 'Raichu',
 'Magneton',
 'Electrode',
 'Electabuzz',
 'Zapdos',
 'Abra',
 'Gastly',
 'Drowzee',
 'Kadabra',
 'Haunter',
 'Jynx',
 'Alakazam',
 'Mewtwo',
 'Sandshrew',
 'Diglett',
 'Machop',
 'Onix',
 'Machoke',
 'Dugtrio',
 'Machamp',
 'Hitmonchan',
 'Pidgey',
 'Rattata',
 'Doduo',
 'Raticate',
 'Farfetch\'d',
 'Porygon',
 'Dratini',
 'Pidgeotto',
 'Clefairy',
 'Chansey',
 'Dragonair',
 'Energy Removal',
 'Potion',
 'Gust of Wind',
 'Switch',
 'Bill',
 'Super Potion',
 'Energy Retrieval',
 'Professor Oak',
 'Revive',
 'Defender',
 'Full Heal',
 'PlusPower',
 'Pokedex',
 'Pokemon Center',
 'Pokemon Flute',
 'Maintenance',
 'Devolution Spray',
 'Item Finder',
 'Super Energy Removal',
 'Impostor Professor Oak',
 'Computer Search',
 'Clefairy Doll',
 'Scoop Up',
 'Pokemon Trader',
 'Pokemon Breeder',
 'Lass',
 'Double Colorless Energy',
 'Grass Energy',
 'Fire Energy',
 'Water Energy',
 'Lightning Energy',
 'Psychic Energy',
 'Fighting Energy'
] as const)
export function japaneseBaseExpansionScan(card:Pick<SetCard,'id'|'localId'>,requestedLanguage:string,quality:'low'|'high'='low'):ResolvedCardImage|undefined{
 if(requestedLanguage!=='ja'||!['base1','pmcg1'].includes(setIdFromCardId(card.id).toLowerCase())||!/^\d{1,3}$/.test(card.localId))return undefined
 const number=Number(card.localId)
 if(!Number.isInteger(number)||number<1||number>japaneseBaseExpansionNames.length)return undefined
 const name=japaneseBaseExpansionNames[number-1]
 const slug=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'')
 const url=`https://den-cards.pokellector.com/311/${slug}.EXP.${number}.${37250+number}.png`
 return{url,language:'ja',quality,source:'local-override',isFallback:false,verified:true}
}
export function traditionalChineseSc2dScan(card:Pick<SetCard,'id'|'localId'>,requestedLanguage:string,quality:'low'|'high'='low'):ResolvedCardImage|undefined{
 if(requestedLanguage!=='zh-tw'||setIdFromCardId(card.id).toLowerCase()!=='sc2d'||!/^\d{1,3}$/.test(card.localId))return undefined
 const number=Number(card.localId)
 if(!Number.isInteger(number)||number<1||number>157)return undefined
 // Pokémon Taiwan's official SC2D detail records run from 1234 (001/157) to 1390 (157/157).
 const officialCardId=1233+number
 const url=`https://asia.pokemon-card.com/tw/card-img/tw${String(officialCardId).padStart(8,'0')}.png`
 return{url,language:'zh-tw',quality,source:'local-override',isFallback:false,verified:true}
}
const cleanUrl=(url:string)=>url.replace(/[?&]pvRetry=\d+/g,'').replace(/[?&]$/,'')
const isRejected=(url:string|undefined,rejected:Set<string>)=>!!url&&rejected.has(cleanUrl(url))
const subsetAssetPaths:Record<string,{serie:string;set:string;languages?:string[]}>={
 'swsh4.5sv':{serie:'swsh',set:'swsh4.5'},
 'swsh12.5gg':{serie:'swsh',set:'swsh12.5'},
 'swsh9tg':{serie:'swsh',set:'swsh9'},
 'swsh9.5tg':{serie:'swsh',set:'swsh9'},
 'swsh10tg':{serie:'swsh',set:'swsh10'},
 'swsh10.5tg':{serie:'swsh',set:'swsh10'},
 'swsh11tg':{serie:'swsh',set:'swsh11'},
 'swsh11.5tg':{serie:'swsh',set:'swsh11'},
 'swsh12tg':{serie:'swsh',set:'swsh12.5'},
 'swsh12.5tg':{serie:'swsh',set:'swsh12.5'},
 'exu':{serie:'ex',set:'ex10',languages:['fr']},
 'svp':{serie:'sv',set:'svp'},
 'p-a':{serie:'tcgp',set:'P-A'},
}
function subsetImage(card:SetCard,language:string,requestedLanguage:string,quality:'low'|'high',rejected:Set<string>):ResolvedCardImage|undefined{
 const separator=card.id.lastIndexOf('-')
 if(separator<1)return undefined
 const setId=card.id.slice(0,separator).toLowerCase()
 const mapping=subsetAssetPaths[setId]
 if(!mapping||mapping.languages&&!mapping.languages.includes(language)||!card.localId)return undefined
 const localId=encodeURIComponent(card.localId)
 const base='https://assets.tcgdex.net/'+language+'/'+mapping.serie+'/'+mapping.set+'/'+localId+'/'
 const formats=quality==='high'?['high.webp','high.png','low.webp','low.png']:['low.webp','low.png','high.webp','high.png']
 const url=formats.map(file=>base+file).find(candidate=>!isRejected(candidate,rejected))
 return url?{url,language,quality,source:'TCGdex',isFallback:language!==requestedLanguage,verified:true}:undefined
}
const mcdEra=(setId:string)=>{
 const match=setId.match(/^(20\d{2})(bw|xy|sm|swsh|sv)(?:-fr)?$/i)
 if(!match)return undefined
 const year=Number(match[1])
 if(year>=2011&&year<=2013)return 'bw'
 if(year>=2014&&year<=2016)return 'xy'
 if(year>=2017&&year<=2019)return 'sm'
 if(year>=2021&&year<=2022)return 'swsh'
 if(year>=2023&&year<=2024)return 'sv'
 return undefined
}
export async function resolveCatalogueImage(card:SetCard,requestedLanguage:string,quality:'low'|'high'='low',getCard=tcgDexProvider.getCard.bind(tcgDexProvider),rejectedUrls:Set<string>=new Set()){
 requestedLanguage=normalizeImageLanguage(requestedLanguage)
 const allowedFallbacks=imageFallbackOrder(requestedLanguage)
 let fallbackImage:ResolvedCardImage|undefined
 let englishApiFallback:ResolvedCardImage|undefined
 let englishCandidate:ExternalCard|undefined
 const keepFallback=(image:ResolvedCardImage)=>{
  if(image.url&&!isRejected(image.url,rejectedUrls)&&allowedFallbacks.includes(image.language))fallbackImage??={...image,isFallback:true}
 }
 const direct=resolveCardImage({card:{...card,language:requestedLanguage},requestedLanguage,quality,rejectedUrls})
 if(direct.url&&!isRejected(direct.url,rejectedUrls)){
  if(direct.language===requestedLanguage)return direct
  keepFallback(direct)
 }
 const japaneseScan=japaneseBaseExpansionScan(card,requestedLanguage,quality)
 if(japaneseScan?.url&&!isRejected(japaneseScan.url,rejectedUrls))return japaneseScan
 const chineseScan=traditionalChineseSc2dScan(card,requestedLanguage,quality)
 if(chineseScan?.url&&!isRejected(chineseScan.url,rejectedUrls))return chineseScan
 for(const language of allowedFallbacks){
  try{
   const candidate=await getCard(card.id,language)
   if(candidate.id.toLowerCase()!==card.id.toLowerCase())continue
   const isMcDonalds=Boolean(mcdEra(setIdFromCardId(card.id).toLowerCase()))
   if(language==='en')englishCandidate=candidate
   const image=resolveCardImage({card:candidate,requestedLanguage,quality,rejectedUrls})
   if(image.url&&!isRejected(image.url,rejectedUrls)){
    if(image.language===requestedLanguage)return {...image,isFallback:false}
    keepFallback(image)
    if(image.source==='Pokémon TCG API'&&!(requestedLanguage==='ja'||requestedLanguage==='zh-tw')&&!/^mep-\d+$/i.test(card.id)&&!isMcDonalds)englishApiFallback??={...image,isFallback:true}
   }
   const subset=subsetImage(card,language,requestedLanguage,quality,rejectedUrls)
   if(subset){
    if(subset.language===requestedLanguage)return subset
    keepFallback(subset)
   }
   // Pokémon TCG API only has English scans and can misidentify special Asian sets.
   const alternate=resolveCardImage({card:{...candidate,image:undefined},requestedLanguage,quality,rejectedUrls})
   if(alternate.url&&!isRejected(alternate.url,rejectedUrls)&&alternate.source==='Pokémon TCG API'&&!(requestedLanguage==='ja'||requestedLanguage==='zh-tw')&&!/^mep-\d+$/i.test(card.id)&&!isMcDonalds)englishApiFallback??={...alternate,isFallback:true}
  }catch{/* Continue through exact IDs in the allowed fallback order. */}
 }
 if(englishCandidate){
  const promoImage=buildMepPromoImage(englishCandidate)
  if(promoImage&&!isRejected(promoImage,rejectedUrls))return{url:promoImage,language:'en',quality,source:'promo-archive',isFallback:requestedLanguage!=='en',verified:true} satisfies ResolvedCardImage
 }
 // TCGdex has scans for some MEP cards even when its API omits the image field.
 const mepMatch=card.id.match(/^mep-(\d+)$/i)
 if(mepMatch){
  const localId=String(Number(mepMatch[1])).padStart(3,'0')
  const base='https://assets.tcgdex.net/en/me/mep/'+localId
  const formats=quality==='high'?['high.webp','high.png','low.webp','low.png']:['low.webp','low.png','high.webp','high.png']
  const url=formats.map(file=>base+'/'+file).find(candidate=>!isRejected(candidate,rejectedUrls))
  if(url)return{url,language:'en',quality,source:'TCGdex',isFallback:requestedLanguage!=='en',verified:true} satisfies ResolvedCardImage
 }
 if(fallbackImage)return fallbackImage
 if(englishApiFallback)return englishApiFallback
 return{language:requestedLanguage,quality,source:'none',isFallback:false,verified:false} satisfies ResolvedCardImage
}
function cachedResolve(card:SetCard,language:string,quality:'low'|'high',rejectedUrls:Set<string>=new Set()){
 language=normalizeImageLanguage(language)
 const rejectedKey=[...rejectedUrls].map(cleanUrl).sort().join(',')
 const key=`image:${language}:${card.id}:${quality}:${rejectedKey}`
 const existing=imageCache.get(key)
 if(existing?.image&&existing.status==='resolved')return Promise.resolve(existing.image)
 if(existing?.status==='missing'&&existing.expiresAt&&existing.expiresAt>Date.now())return Promise.resolve(existing.image!)
 if(existing?.promise)return existing.promise
 imageCache.delete(key)
 const promise=resolveCatalogueImage(card,language,quality,tcgDexProvider.getCard.bind(tcgDexProvider),rejectedUrls).then(image=>{
  imageCache.set(key,image.url?{status:'resolved',image}:{status:'missing',image,expiresAt:Date.now()+15_000})
  return image
 }).catch(()=>({language,quality,source:'none',isFallback:false,verified:false} satisfies ResolvedCardImage)).finally(()=>{const current=imageCache.get(key);if(current?.status==='pending')imageCache.delete(key)})
 imageCache.set(key,{status:'pending',promise})
 return promise
}
const retryUrl=(url:string,attempt:number)=>attempt?url+(url.includes('?')?'&':'?')+'pvRetry='+attempt:url
export function CatalogueImage({card,quality='low',className='',requestedLanguage='fr'}:Props){
 const [image,setImage]=useState<ResolvedCardImage>(),container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(quality==='high'),[assetLoaded,setAssetLoaded]=useState(false),[rejectedUrls,setRejectedUrls]=useState<string[]>([]),[retryAttempt,setRetryAttempt]=useState(0),[retryNonce,setRetryNonce]=useState(0)
 useEffect(()=>{if(quality==='high'||typeof IntersectionObserver==='undefined'){setVisible(true);return}const observer=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'250px'});if(container.current)observer.observe(container.current);return()=>observer.disconnect()},[quality])
 useEffect(()=>{let active=true;setImage(undefined);setAssetLoaded(false);if(!visible)return
  const rejected=new Set(rejectedUrls)
  cachedResolve(card,requestedLanguage,quality,rejected).then(value=>{if(active){setRetryAttempt(0);setImage(value)}})
  return()=>{active=false}
 },[card.id,card.image,card.localId,card.name,requestedLanguage,quality,visible,rejectedUrls,retryNonce])
 useEffect(()=>{if(!image||image.url)return
  const timer=window.setTimeout(()=>{setRejectedUrls([]);setRetryAttempt(0);setRetryNonce(value=>value+1)},20_000)
  return()=>window.clearTimeout(timer)
 },[image,card.id])
 const show=image?.url
 const failImage=()=>{
  if(!show)return
  setAssetLoaded(false)
  if(retryAttempt<1){window.setTimeout(()=>setRetryAttempt(current=>current+1),300);return}
  const failed=cleanUrl(show)
  setRejectedUrls(current=>current.includes(failed)?current:[...current,failed])
  setRetryAttempt(0)
 }
 useEffect(()=>{if(!show||assetLoaded||!visible)return;const timer=window.setTimeout(()=>{const failed=cleanUrl(show);setRejectedUrls(current=>current.includes(failed)?current:[...current,failed]);setRetryAttempt(0)},3500);return()=>window.clearTimeout(timer)},[show,assetLoaded,visible,retryAttempt])
 return <div ref={container} className={'catalogue-image '+className}>{show?<><img src={retryUrl(show,retryAttempt)} alt={card.name+' '+card.localId+(image.isFallback?' — visuel '+image.language.toUpperCase():'')} loading={quality==='high'?'eager':'lazy'} draggable={false} referrerPolicy="no-referrer" decoding="async" onLoad={()=>setAssetLoaded(true)} onError={failImage}/>{!assetLoaded&&<div className="catalogue-image-loading" role="status"><span className="pv-spinner" aria-hidden="true"/><span>Chargement du visuel…</span></div>}</>:<div className="catalogue-image-empty"><strong>{card.name}</strong><span>Nº {card.localId}</span><small>{!visible?'Le visuel se chargera automatiquement à l’affichage':image?'Visuel indisponible — nouvelle tentative automatique':<span className="loading-feedback"><span className="pv-spinner" aria-hidden="true"/>Chargement du visuel…</span>}</small></div>}{image?.isFallback&&show&&<small className="image-language">Visuel {image.language==='ja'?'JP':image.language.toUpperCase()}</small>}</div>
}
export const clearImageCacheForTests=()=>imageCache.clear()
