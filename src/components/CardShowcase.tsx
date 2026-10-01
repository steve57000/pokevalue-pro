import { useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { X, RotateCcw, ExternalLink, FlipHorizontal2, BarChart3, Plus, CheckCircle2 } from 'lucide-react'
import { CatalogueImage } from './CatalogueImage'
import type { SetCard } from '../api/sets'
import {useModalDialog} from '../hooks/useModalDialog'
import {FavoriteButton} from './FavoriteButton'

const POKEMON_CARD_BACK = `${import.meta.env.BASE_URL}images/pokemon-card-back.jpg`

type Props = {
  card: SetCard
  setName: string
  owned: boolean
  onToggle: () => void
  quantity?: number
  favorite?: boolean
  onFavorite?: () => void
  onIncrement?: () => void
  onDetails?: () => void
  onClose: () => void
  cardmarketUrl: string
}
export const dragRotation = (origin:{x:number;y:number;rx:number;ry:number}, point:{x:number;y:number}) => ({x:Math.max(-180,Math.min(180,origin.rx-(point.y-origin.y)*.55)),y:Math.max(-180,Math.min(180,origin.ry+(point.x-origin.x)*.55))})
export const flipRotation = (rotation:{x:number;y:number}) => ({x:0,y:Math.abs((((rotation.y%360)+360)%360)-180)<90?0:180})
export function CardShowcase({ card, setName, owned, onToggle, quantity=owned?1:0, favorite=false, onFavorite, onIncrement, onDetails, onClose, cardmarketUrl }: Props) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const origin = useRef({ x: 0, y: 0, rx: 0, ry: 0 })
  const activePointer = useRef<number | null>(null)
  const dialogRef=useModalDialog(onClose)
  const down = (event: PointerEvent<HTMLDivElement>) => {
    activePointer.current = event.pointerId
    origin.current = { x: event.clientX, y: event.clientY, rx: rotation.x, ry: rotation.y }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return
    setRotation(dragRotation(origin.current,{x:event.clientX,y:event.clientY}))
  }
  const up = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return
    activePointer.current = null
    setDragging(false)
  }
  const lighting = {
    '--light-x': `${50 + rotation.y / 3}%`, '--light-y': `${50 + rotation.x / 3}%`,
    '--shadow-x': `${Math.round(rotation.y * .25)}px`, '--shadow-y': `${Math.round(32 - rotation.x * .1)}px`,
  } as React.CSSProperties
  return createPortal(<div className="showcase-backdrop" role="presentation" onPointerDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={dialogRef as React.RefObject<HTMLDivElement>} className="showcase" role="dialog" aria-modal="true" aria-label={`${card.name}, ${setName}`}>
      <button className="showcase-close" onClick={onClose} aria-label="Fermer la carte"><X/></button>
      <div className="showcase-spotlight" aria-hidden="true" />
      <div className="showcase-stage">
        <div className={`showcase-card ${dragging ? 'dragging' : ''}`} style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`, ...lighting }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="showcase-face showcase-front"><CatalogueImage key={card.id} card={card} quality="high"/><div className="showcase-sheen" aria-hidden="true"/></div>
          <div className="showcase-face showcase-back"><img src={POKEMON_CARD_BACK} alt="Dos officiel d’une carte Pokémon" draggable={false}/></div>
        </div>
      </div>
      <div className="showcase-info"><span className="showcase-overline">{setName} · Nº {card.localId}</span><h2>{card.name}</h2><p>Maintiens et déplace la carte pour la faire pivoter. Glisse avec le doigt sur mobile.</p>
        <div className="showcase-actions"><button className="showcase-flip" onClick={()=>setRotation(flipRotation(rotation))}><FlipHorizontal2 size={18}/>{Math.abs((((rotation.y%360)+360)%360)-180)<90?'Voir le recto':'Voir le verso'}</button><div className="showcase-secondary">{owned?<span className="showcase-owned"><CheckCircle2 size={17}/> ×{quantity}</span>:<button onClick={onToggle}>Ajouter à ma collection</button>}{owned&&onIncrement&&<button onClick={onIncrement} aria-label="Ajouter un exemplaire"><Plus size={17}/>1</button>}{onFavorite&&<FavoriteButton favorite={favorite} onToggle={onFavorite}/>} {onDetails&&<button onClick={onDetails} aria-label="Détails et statistiques"><BarChart3 size={18}/></button>}<button onClick={()=>setRotation({x:0,y:0})} aria-label="Recentrer la carte" title="Recentrer"><RotateCcw size={18}/></button></div><a href={cardmarketUrl} target="_blank" rel="noopener noreferrer">Voir sur Cardmarket <ExternalLink size={15}/></a></div>
      </div>
    </div>
  </div>, document.body)
}
