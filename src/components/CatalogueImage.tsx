import { useEffect,useMemo,useRef,useState } from 'react'
import type { SetCard } from '../api/sets'
import { tcgDexProvider } from '../api/tcgdex'
import { resolveCardImage } from '../domain/image'
import type { ExternalCard } from '../domain/cards'
type Props={card:SetCard;quality?:'low'|'high';className?:string;requestedLanguage?:string}
export const imageFallbackOrder=(requested:string)=>[requested,...(requested==='fr'?['en','ja','zh-tw']:requested==='en'?['fr','ja','zh-tw']:requested==='ja'?['en','fr','zh-tw']:['en','fr','ja'])].filter((x,i,a)=>a.indexOf(x)===i)
export function CatalogueImage({card,quality='low',className='',requestedLanguage='fr'}:Props){
 const [resolved,setResolved]=useState<ExternalCard>(()=>({id:card.id,name:card.name,localId:card.localId,image:card.image,language:requestedLanguage})),[failed,setFailed]=useState(false),container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(quality==='high')
 useEffect(()=>{if(quality==='high')return;const observer=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'250px'});if(container.current)observer.observe(container.current);return()=>observer.disconnect()},[quality])
 useEffect(()=>{setResolved({id:card.id,name:card.name,localId:card.localId,image:card.image,language:requestedLanguage});setFailed(false)},[card.id,card.image,card.localId,card.name,requestedLanguage])
 useEffect(()=>{if(!visible||(!failed&&resolved.image))return;let active=true;(async()=>{for(const language of imageFallbackOrder(requestedLanguage)){if(language===resolved.language)continue;try{const candidate=await tcgDexProvider.getCard(card.id,language);if(candidate.id===card.id&&candidate.image){if(active){setResolved(candidate);setFailed(false)}return}}catch{/* try the next exact-language printing */}}if(active)setFailed(true)})();return()=>{active=false}},[visible,failed,resolved.image,resolved.language,requestedLanguage,card.id])
 const image=useMemo(()=>resolveCardImage({card:resolved,requestedLanguage,quality}),[resolved,requestedLanguage,quality])
 return <div ref={container} className={`catalogue-image ${className}`}>{visible&&image.url&&!failed?<img src={image.url} alt={`${card.name} ${card.localId}${image.isFallback?` — visuel ${image.language.toUpperCase()}`:''}`} loading={quality==='high'?'eager':'lazy'} draggable={false} onError={()=>setFailed(true)}/>:<div className="catalogue-image-empty"><strong>{card.name}</strong><span>Nº {card.localId}</span><small>{visible?'Visuel non fourni par les sources':'Chargement du visuel…'}</small></div>}{image.isFallback&&image.url&&!failed&&<small className="image-language">Visuel {image.language.toUpperCase()}</small>}</div>
}
