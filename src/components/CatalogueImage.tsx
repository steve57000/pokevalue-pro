import {useEffect,useRef,useState} from 'react'
import type {SetCard} from '../api/sets'
import {tcgDexProvider} from '../api/tcgdex'
import {buildMepPromoImage,isPokemonCardBackUrl,resolveCardImage,type ResolvedCardImage} from '../domain/image'
import type {ExternalCard} from '../domain/cards'
type Props={card:SetCard;quality?:'low'|'high';className?:string;requestedLanguage?:string}
type CacheEntry={status:'pending'|'resolved'|'missing';promise?:Promise<ResolvedCardImage>;image?:ResolvedCardImage;expiresAt?:number}
const imageCache=new Map<string,CacheEntry>()
export const imageFallbackOrder=(requested:string)=>[requested,...(requested==='fr'?['en','ja','zh-tw']:requested==='en'?['fr','ja','zh-tw']:requested==='ja'?['en','fr','zh-tw']:['en','fr','ja'])].filter((x,i,a)=>a.indexOf(x)===i)
const cleanUrl=(url:string)=>url.replace(/[?&]pvRetry=\\d+/g,'').replace(/[?&]$/,'')
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
}
function subsetImage(card:SetCard,language:string,quality:'low'|'high',rejected:Set<string>):ResolvedCardImage|undefined{
 const separator=card.id.lastIndexOf('-')
 if(separator<1)return undefined
 const setId=card.id.slice(0,separator).toLowerCase()
 const mapping=subsetAssetPaths[setId]
 if(!mapping||mapping.languages&&!mapping.languages.includes(language)||!card.localId)return undefined
 const localId=encodeURIComponent(card.localId)
 const base='https://assets.tcgdex.net/'+language+'/'+mapping.serie+'/'+mapping.set+'/'+localId+'/'
 const formats=quality==='high'?['high.png','high.webp']:['low.webp','low.png','high.png']
 const url=formats.map(file=>base+file).find(candidate=>!isRejected(candidate,rejected))
 return url?{url,language,quality,source:'TCGdex',isFallback:language!=='fr',verified:true}:undefined
}
export async function resolveCatalogueImage(card:SetCard,requestedLanguage:string,quality:'low'|'high'='low',getCard=tcgDexProvider.getCard.bind(tcgDexProvider),rejectedUrls:Set<string>=new Set()){
 const direct=resolveCardImage({card:{...card,language:requestedLanguage},requestedLanguage,quality})
 if(direct.url&&!isRejected(direct.url,rejectedUrls)&&!isPokemonCardBackUrl(direct.url)&&(direct.source==='local-override'||card.image))return direct
 let englishCandidate:ExternalCard|undefined
 for(const language of imageFallbackOrder(requestedLanguage)){
  try{
   const candidate=await getCard(card.id,language)
   if(candidate.id!==card.id)continue
   if(language==='en')englishCandidate=candidate
   const image=resolveCardImage({card:candidate,requestedLanguage,quality})
   if(image.url&&!isRejected(image.url,rejectedUrls)&&image.source==='TCGdex')return image
   const subset=subsetImage(card,language,quality,rejectedUrls)
   if(subset)return subset
   // The Pokémon TCG API only has English scans. Its set-id guesses can resolve
   // to a generic card back for Japanese printings, so never use that source for Asian catalogues.
   const isMepPromo=/^mep-\\d+$/i.test(card.id)
   if(image.url&&!isRejected(image.url,rejectedUrls)&&!(image.source==='Pokémon TCG API'&&(requestedLanguage==='ja'||requestedLanguage==='zh-tw'||isMepPromo)))return image
  }catch{/* Continue through the other exact-language image sources. */}
 }
 if(englishCandidate){
  const promoImage=buildMepPromoImage(englishCandidate)
  if(promoImage&&!isRejected(promoImage,rejectedUrls))return{url:promoImage,language:'en',quality,source:'promo-archive',isFallback:requestedLanguage!=='en',verified:true} satisfies ResolvedCardImage
 }
 // TCGdex has scans for some MEP cards even when its API omits the image field.
 const mepMatch=card.id.match(/^mep-(\\d+)$/i)
 if(mepMatch){
  const localId=String(Number(mepMatch[1])).padStart(3,'0')
  const base='https://assets.tcgdex.net/en/me/mep/'+localId+'/'
  const formats=quality==='high'?['high.png','high.webp']:['low.webp','low.png','high.png']
  const url=formats.map(file=>base+file).find(candidate=>!isRejected(candidate,rejectedUrls))
  if(url)return{url,language:'en',quality,source:'TCGdex',isFallback:requestedLanguage!=='en',verified:true} satisfies ResolvedCardImage
 }
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
  cachedResolve(card,requestedLanguage,quality,rejected).then(value=>{if(active)setImage(value)})
  return()=>{active=false}
 },[card.id,card.image,card.localId,card.name,requestedLanguage,quality,visible,rejectedUrls,retryNonce])
 useEffect(()=>{if(!image||image.url)return
  const timer=window.setTimeout(()=>{setRejectedUrls([]);setRetryAttempt(0);setRetryNonce(value=>value+1)},20_000)
  return()=>window.clearTimeout(timer)
 },[image,card.id])
 const mark=name.match(/30|[A-ZÀ-Þ]{2}/i)?.[0]??name.trim().split(/\\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()
 const show=image?.url
 const failImage=()=>{
  if(!show)return
  if(retryAttempt<2){window.setTimeout(()=>setRetryAttempt(current=>current+1),500*(2**retryAttempt));return}
  const failed=cleanUrl(show)
  setRejectedUrls(current=>current.includes(failed)?current:[...current,failed])
  setRetryAttempt(0)
 }
 return <div ref={container} className={`catalogue-image ${className}`}>{show?<img src={retryUrl(show,retryAttempt)} alt={`${card.name} ${card.localId}${image.isFallback?` — visuel ${image.language.toUpperCase()}`:''}`} loading={quality==='high'?'eager':'lazy'} draggable={false} decoding="async" onError={failImage} onLoad={()=>{if(retryAttempt)setRetryAttempt(0)}}/>:<div className="catalogue-image-empty"><strong>{card.name}</strong><span>Nº {card.localId}</span><small>{visible&&image?'Visuel indisponible — nouvelle tentative automatique':'Chargement du visuel…'}</small></div>}{image?.isFallback&&show&&<small className="image-language">Visuel {image.language==='ja'?'JP':image.language.toUpperCase()}</small>}</div>
}
export const clearImageCacheForTests=()=>imageCache.clear()
