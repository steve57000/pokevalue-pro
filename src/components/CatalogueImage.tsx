import {useEffect,useRef,useState} from 'react'
import type {SetCard} from '../api/sets'
import {tcgDexProvider} from '../api/tcgdex'
import {buildMepPromoImage,isPokemonCardBackUrl,resolveCardImage,type ResolvedCardImage} from '../domain/image'
import type {ExternalCard} from '../domain/cards'
type Props={card:SetCard;quality?:'low'|'high';className?:string;requestedLanguage?:string}
type CacheEntry={status:'pending'|'resolved'|'missing';promise?:Promise<ResolvedCardImage>;image?:ResolvedCardImage}
const imageCache=new Map<string,CacheEntry>()
export const imageFallbackOrder=(requested:string)=>[requested,...(requested==='fr'?['en','ja','zh-tw']:requested==='en'?['fr','ja','zh-tw']:requested==='ja'?['en','fr','zh-tw']:['en','fr','ja'])].filter((x,i,a)=>a.indexOf(x)===i)
export async function resolveCatalogueImage(card:SetCard,requestedLanguage:string,quality:'low'|'high'='low',getCard=tcgDexProvider.getCard.bind(tcgDexProvider)){const direct=resolveCardImage({card:{...card,language:requestedLanguage},requestedLanguage,quality});if(direct.url&&!isPokemonCardBackUrl(direct.url)&&(direct.source==='local-override'||card.image))return direct
 let englishCandidate:ExternalCard|undefined
 for(const language of imageFallbackOrder(requestedLanguage)){try{const candidate=await getCard(card.id,language);if(candidate.id!==card.id)continue;if(language==='en')englishCandidate=candidate;const image=resolveCardImage({card:candidate,requestedLanguage,quality});
 // The Pokémon TCG API only has English scans. Its set-id guesses can resolve
 // to a generic card back for Japanese printings, so never use that source for
 // Asian-language catalogues. Native TCGdex fronts remain eligible above.
 const isMepPromo=/^mep-\\d+$/i.test(card.id);if(image.url&&!(image.source==='Pokémon TCG API'&&(requestedLanguage==='ja'||requestedLanguage==='zh-tw'||isMepPromo)))return image}catch{/* Only exact identifiers are eligible; continue deterministically. */}}
 if(englishCandidate){const promoImage=buildMepPromoImage(englishCandidate);if(promoImage)return{url:promoImage,language:'en',quality,source:'promo-archive',isFallback:requestedLanguage!=='en',verified:true} satisfies ResolvedCardImage}
 return{language:requestedLanguage,quality,source:'none',isFallback:false,verified:false} satisfies ResolvedCardImage}
function cachedResolve(card:SetCard,language:string,quality:'low'|'high'){const key=`image:${language}:${card.id}:${quality}`,existing=imageCache.get(key);if(existing?.image)return Promise.resolve(existing.image);if(existing?.status==='missing')return Promise.resolve({language,quality,source:'none',isFallback:false,verified:false} satisfies ResolvedCardImage);if(existing?.promise)return existing.promise
 const promise=resolveCatalogueImage(card,language,quality).then(image=>{imageCache.set(key,image.url?{status:'resolved',image}:{status:'missing',image});return image});imageCache.set(key,{status:'pending',promise});return promise}
export function CatalogueImage({card,quality='low',className='',requestedLanguage='fr'}:Props){
 const [image,setImage]=useState<ResolvedCardImage>(),container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(quality==='high')
 useEffect(()=>{if(quality==='high'||typeof IntersectionObserver==='undefined'){setVisible(true);return}const observer=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'250px'});if(container.current)observer.observe(container.current);return()=>observer.disconnect()},[quality])
 useEffect(()=>{let active=true;setImage(undefined);if(visible)cachedResolve(card,requestedLanguage,quality).then(value=>active&&setImage(value));return()=>{active=false}},[card.id,card.image,card.localId,card.name,requestedLanguage,quality,visible])
 const show=image?.url
 return <div ref={container} className={`catalogue-image ${className}`}>{show?<img src={show} alt={`${card.name} ${card.localId}${image.isFallback?` — visuel ${image.language.toUpperCase()}`:''}`} loading={quality==='high'?'eager':'lazy'} draggable={false} decoding="async"/>:<div className="catalogue-image-empty"><strong>{card.name}</strong><span>Nº {card.localId}</span><small>{visible&&image?'Visuel temporairement indisponible':'Chargement du visuel…'}</small></div>}{image?.isFallback&&show&&<small className="image-language">Visuel {image.language==='ja'?'JP':image.language.toUpperCase()}</small>}</div>
}
export const clearImageCacheForTests=()=>imageCache.clear()
