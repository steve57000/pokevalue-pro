import {useEffect,useRef,useState} from 'react'
import type {SetCard} from '../api/sets'
import {tcgDexProvider} from '../api/tcgdex'
import {buildMepPromoImage,isPokemonCardBackUrl,resolveCardImage,setIdFromCardId,type ResolvedCardImage} from '../domain/image'
import type {ExternalCard} from '../domain/cards'
type Props={card:SetCard;quality?:'low'|'high';className?:string;requestedLanguage?:string}
type CacheEntry={status:'pending'|'resolved'|'missing';promise?:Promise<ResolvedCardImage>;image?:ResolvedCardImage;expiresAt?:number}
const imageCache=new Map<string,CacheEntry>()
export const imageFallbackOrder=(requested:string)=>[requested,...(requested==='fr'?['en','ja','zh-tw']:requested==='en'?['fr','ja','zh-tw']:requested==='ja'?['en','fr','zh-tw']:['en','fr','ja'])].filter((x,i,a)=>a.indexOf(x)===i)
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
 const formats=quality==='high'?['high.png','high.webp']:['low.webp','low.png','high.png']
 const url=formats.map(file=>base+file).find(candidate=>!isRejected(candidate,rejected))
 return url?{url,language,quality,source:'TCGdex',isFallback:language!==requestedLanguage,verified:true}:undefined
}
type ArtworkCandidate={id:string;name:string;image?:string}
export const asianAssetSeries=(setId:string)=>{
 const id=setId.toLowerCase()
 // Asian set IDs use both short codes (s4a) and full English-era prefixes (swsh4a).
 if(/^m\\d/.test(id)||id.startsWith('me'))return 'me'
 if(id.startsWith('sv'))return 'sv'
 if(id.startsWith('swsh')||/^s\\d/.test(id))return 'swsh'
 if(id.startsWith('sm'))return 'sm'
 if(id.startsWith('xy'))return 'xy'
 if(id.startsWith('bw'))return 'bw'
 if(/^(base|jungle|fossil|rocket|gym)/.test(id))return 'base'
 if(id.startsWith('neo'))return 'neo'
 if(id.startsWith('ecard'))return 'ecard'
 if(id.startsWith('ex'))return 'ex'
 if(id.startsWith('dp')||id.startsWith('pl'))return 'dp'
 if(id.startsWith('hgss'))return 'hgss'
 return undefined
}
export function nativeAsianSetImage(card:SetCard,language:string,quality:'low'|'high',rejected:Set<string>=new Set()):ResolvedCardImage|undefined{
 if((language!=='ja'&&language!=='zh-tw')||!card.localId)return undefined
 const setId=setIdFromCardId(card.id),serie=asianAssetSeries(setId)
 if(!serie)return undefined
 const localId=encodeURIComponent(card.localId)
 const root=`https://assets.tcgdex.net/${language}/${serie}/${setId.toLowerCase()}/${localId}/`
 const formats=quality==='high'?['high.png','high.webp','low.webp','low.png']:['low.webp','low.png','high.webp','high.png']
 const url=formats.map(file=>root+file).find(candidate=>!isRejected(candidate,rejected))
 return url?{url,language,quality,source:'TCGdex',isFallback:false,verified:true}:undefined
}
const mcdArtworkCache=new Map<string,Promise<ArtworkCandidate[]>>()
const normalizeArtworkName=(name:string)=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('en')
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
export function selectRelatedArtwork(candidates:ArtworkCandidate[],mcdSetId:string,rejectedUrls:Set<string>=new Set()){
 const era=mcdEra(mcdSetId)
 const sameEra=candidates.filter(candidate=>candidate.image&&setIdFromCardId(candidate.id).toLowerCase()!==mcdSetId&&(!era||setIdFromCardId(candidate.id).toLowerCase().startsWith(era)))
 const otherEra=candidates.filter(candidate=>candidate.image&&setIdFromCardId(candidate.id).toLowerCase()!==mcdSetId&&!sameEra.includes(candidate))
 return [...sameEra,...otherEra].find(candidate=>candidate.image&&![candidate.image,`${candidate.image}/low.webp`,`${candidate.image}/high.webp`,`${candidate.image}/low.png`,`${candidate.image}/high.png`].some(url=>isRejected(url,rejectedUrls)))
}
async function searchRelatedArtwork(name:string){
 const key=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('en')
 let pending=mcdArtworkCache.get(key)
 if(!pending){
  pending=fetch(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(name)}`,{signal:AbortSignal.timeout(8000)})
   .then(response=>response.ok?response.json() as Promise<ArtworkCandidate[]>:[])
   .then(cards=>Array.isArray(cards)?cards.filter(card=>card&&typeof card.id==='string'&&typeof card.name==='string'&&typeof card.image==='string'&&normalizeArtworkName(card.name)===key):[])
   .catch(()=>[])
  mcdArtworkCache.set(key,pending)
 }
 return pending
}
export async function resolveCatalogueImage(card:SetCard,requestedLanguage:string,quality:'low'|'high'='low',getCard=tcgDexProvider.getCard.bind(tcgDexProvider),rejectedUrls:Set<string>=new Set(),relatedSearch=searchRelatedArtwork){
 const direct=resolveCardImage({card:{...card,language:requestedLanguage},requestedLanguage,quality})
 if(direct.url&&!isRejected(direct.url,rejectedUrls)&&!isPokemonCardBackUrl(direct.url)&&(direct.source==='local-override'||card.image))return direct
 let englishCandidate:ExternalCard|undefined
 let englishApiFallback:ResolvedCardImage|undefined
 for(const language of imageFallbackOrder(requestedLanguage)){
  try{
   const candidate=await getCard(card.id,language)
   if(candidate.id!==card.id)continue
   const isMcDonalds=Boolean(mcdEra(setIdFromCardId(card.id).toLowerCase()))
   if(language==='en')englishCandidate=candidate
   const image=resolveCardImage({card:candidate,requestedLanguage,quality})
   if(image.url&&!isRejected(image.url,rejectedUrls)&&image.source==='TCGdex')return image
   if(image.url&&isRejected(image.url,rejectedUrls)){
    const alternate=resolveCardImage({card:{...candidate,image:undefined},requestedLanguage,quality})
    const isMepPromo=/^mep-\d+$/i.test(card.id)
    if(alternate.url&&!isRejected(alternate.url,rejectedUrls)&&alternate.source==='Pokémon TCG API'&&!(requestedLanguage==='ja'||requestedLanguage==='zh-tw'||isMepPromo||isMcDonalds))englishApiFallback??=alternate
   }
   const subset=subsetImage(card,language,requestedLanguage,quality,rejectedUrls)
   if(subset)return subset
   if(language===requestedLanguage){const native=nativeAsianSetImage(card,requestedLanguage,quality,rejectedUrls);if(native)return native}
   // The Pokémon TCG API only has English scans. Its set-id guesses can resolve
   // to a generic card back for Japanese printings, so never use that source for Asian catalogues.
   const isMepPromo=/^mep-\d+$/i.test(card.id)
   if(image.url&&!isRejected(image.url,rejectedUrls)){if(image.source==='Pokémon TCG API'){if(!(requestedLanguage==='ja'||requestedLanguage==='zh-tw'||isMepPromo||isMcDonalds))englishApiFallback??=image}else return image}
  }catch{/* Continue through the other exact-language image sources. */}
 }
 if(englishCandidate){
  const promoImage=buildMepPromoImage(englishCandidate)
  if(promoImage&&!isRejected(promoImage,rejectedUrls))return{url:promoImage,language:'en',quality,source:'promo-archive',isFallback:requestedLanguage!=='en',verified:true} satisfies ResolvedCardImage
 }
 // TCGdex has scans for some MEP cards even when its API omits the image field.
 const mepMatch=card.id.match(/^mep-(\d+)$/i)
 if(mepMatch){
  const localId=String(Number(mepMatch[1])).padStart(3,'0')
  const base='https://assets.tcgdex.net/en/me/mep/'+localId+'/'
  const formats=quality==='high'?['high.png','high.webp']:['low.webp','low.png','high.png']
  const url=formats.map(file=>base+file).find(candidate=>!isRejected(candidate,rejectedUrls))
  if(url)return{url,language:'en',quality,source:'TCGdex',isFallback:requestedLanguage!=='en',verified:true} satisfies ResolvedCardImage
 }
 if(englishCandidate){
  const related=selectRelatedArtwork(await relatedSearch(englishCandidate.name),setIdFromCardId(card.id).toLowerCase(),rejectedUrls)
  if(related?.image){
   const url=quality==='high'?related.image+'/high.webp':related.image+'/low.webp'
   if(!isRejected(url,rejectedUrls))return{url,language:'en',quality,source:'TCGdex',isFallback:true,verified:true} satisfies ResolvedCardImage
  }
 }
 if(englishApiFallback)return englishApiFallback
 return{language:requestedLanguage,quality,source:'none',isFallback:false,verified:false} satisfies ResolvedCardImage
}
function cachedResolve(card:SetCard,language:string,quality:'low'|'high',rejectedUrls:Set<string>=new Set()){
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
 const [image,setImage]=useState<ResolvedCardImage>(),container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(quality==='high'),[rejectedUrls,setRejectedUrls]=useState<string[]>([]),[retryAttempt,setRetryAttempt]=useState(0),[retryNonce,setRetryNonce]=useState(0)
 useEffect(()=>{if(quality==='high'||typeof IntersectionObserver==='undefined'){setVisible(true);return}const observer=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'250px'});if(container.current)observer.observe(container.current);return()=>observer.disconnect()},[quality])
 useEffect(()=>{let active=true;setImage(undefined);if(!visible)return
  const rejected=new Set(rejectedUrls)
  cachedResolve(card,requestedLanguage,quality,rejected).then(value=>{if(active){setRetryAttempt(0);setImage(value)}})
  return()=>{active=false}
 },[card.id,card.image,card.localId,card.name,requestedLanguage,quality,visible,rejectedUrls,retryNonce])
 useEffect(()=>{if(!image||image.url)return
  const timer=window.setTimeout(()=>{setRejectedUrls([]);setRetryAttempt(0);setRetryNonce(value=>value+1)},20_000)
  return()=>window.clearTimeout(timer)
 },[image,card.id])
 const mark=card.name.match(/30|[A-ZÀ-Þ]{2}/i)?.[0]??card.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()
 const show=image?.url
 const failImage=()=>{
  if(!show)return
  if(retryAttempt<2){window.setTimeout(()=>setRetryAttempt(current=>current+1),500*(2**retryAttempt));return}
  const failed=cleanUrl(show)
  setRejectedUrls(current=>current.includes(failed)?current:[...current,failed])
  setRetryAttempt(0)
 }
 return <div ref={container} className={`catalogue-image ${className}`}>{show?<img src={retryUrl(show,retryAttempt)} alt={`${card.name} ${card.localId}${image.isFallback?` — visuel ${image.language.toUpperCase()}`:''}`} loading={quality==='high'?'eager':'lazy'} draggable={false} decoding="async" onError={failImage}/>:<div className="catalogue-image-empty"><strong>{card.name}</strong><span>Nº {card.localId}</span><small>{visible&&image?'Visuel indisponible — nouvelle tentative automatique':'Chargement du visuel…'}</small></div>}{image?.isFallback&&show&&<small className="image-language">Visuel {image.language==='ja'?'JP':image.language.toUpperCase()}</small>}</div>
}
export const clearImageCacheForTests=()=>imageCache.clear()
