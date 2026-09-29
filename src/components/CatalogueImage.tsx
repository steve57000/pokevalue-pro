import { useEffect, useRef, useState } from 'react'
import type { SetCard } from '../api/sets'
import { tcgDexProvider } from '../api/tcgdex'

type Props = { card: SetCard; quality?: 'low'|'high'; className?: string }
export function CatalogueImage({card,quality='low',className=''}: Props) {
  const [base,setBase] = useState(card.image)
  const [language,setLanguage] = useState<'fr'|'en'>('fr')
  const [attempt,setAttempt] = useState(0)
  const [unavailable,setUnavailable] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const [visible,setVisible] = useState(false)
  const sources = base ? [`${base}/${quality}.webp`,`${base}/${quality}.png`,`${base}/low.png`] : []
  useEffect(()=>{
    const observer = new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'250px'})
    if(container.current) observer.observe(container.current)
    return ()=>observer.disconnect()
  },[])
  useEffect(()=>{
    if (!visible || unavailable || (base && attempt < sources.length)) return
    let active = true
    if(language==='en'){setUnavailable(true);return}
    tcgDexProvider.getCard(card.id,'en').then(data=>{
      if(!active)return
      if(data.image){setBase(data.image);setLanguage('en');setAttempt(0)}else setUnavailable(true)
    }).catch(()=>{if(active)setUnavailable(true)})
    return ()=>{active=false}
  },[visible,base,attempt,language,card.id,unavailable,sources.length])
  return <div ref={container} className={`catalogue-image ${className}`}>
    {sources[attempt]&&!unavailable?<img src={sources[attempt]} alt={`${card.name} ${card.localId}${language==='en'?' — visuel anglais':''}`} loading={quality==='high'?'eager':'lazy'} draggable={false} onError={()=>setAttempt(n=>n+1)}/>:<div className="catalogue-image-empty"><strong>{card.name}</strong><span>Nº {card.localId}</span><small>{unavailable?'Visuel non fourni par la source':'Chargement du visuel…'}</small></div>}
    {language==='en'&&!unavailable&&<small className="image-language">Visuel anglais</small>}
  </div>
}
