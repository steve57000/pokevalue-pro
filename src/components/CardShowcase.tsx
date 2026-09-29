import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { X, RotateCcw, ExternalLink } from 'lucide-react'
import { buildTcgDexImageUrl } from '../api/tcgdex'
import type { SetCard } from '../api/sets'

const POKEMON_CARD_BACK = 'https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg'

type Props = {
  card: SetCard
  setName: string
  owned: boolean
  onToggle: () => void
  onClose: () => void
  cardmarketUrl: string
}
export function CardShowcase({ card, setName, owned, onToggle, onClose, cardmarketUrl }: Props) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const origin = useRef({ x: 0, y: 0, rx: 0, ry: 0 })
  const activePointer = useRef<number | null>(null)
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', keydown) }
  }, [onClose])
  const down = (event: PointerEvent<HTMLDivElement>) => {
    activePointer.current = event.pointerId
    origin.current = { x: event.clientX, y: event.clientY, rx: rotation.x, ry: rotation.y }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    setRotation({ x: Math.max(-180, Math.min(180, origin.current.rx - dy * .55)), y: Math.max(-180, Math.min(180, origin.current.ry + dx * .55)) })
  }
  const up = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return
    activePointer.current = null
    setDragging(false)
    setRotation({ x: 0, y: 0 })
  }
  const image = buildTcgDexImageUrl(card.image, 'high')
  const lighting = {
    '--light-x': `${50 + rotation.y / 3}%`, '--light-y': `${50 + rotation.x / 3}%`,
    '--shadow-x': `${Math.round(rotation.y * .25)}px`, '--shadow-y': `${Math.round(32 - rotation.x * .1)}px`,
  } as React.CSSProperties
  return createPortal(<div className="showcase-backdrop" role="presentation" onPointerDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="showcase" role="dialog" aria-modal="true" aria-label={`${card.name}, ${setName}`}>
      <button className="showcase-close" onClick={onClose} aria-label="Fermer la carte"><X/></button>
      <div className="showcase-spotlight" aria-hidden="true" />
      <div className="showcase-stage">
        <div className={`showcase-card ${dragging ? 'dragging' : ''}`} style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`, ...lighting }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="showcase-face showcase-front">{image ? <img src={image} alt={`${card.name}, carte ${card.localId} de ${setName}`} draggable={false}/> : <div className="showcase-no-image">Image indisponible</div>}<div className="showcase-sheen" aria-hidden="true"/></div>
          <div className="showcase-face showcase-back"><img src={POKEMON_CARD_BACK} alt="Dos officiel d’une carte Pokémon" draggable={false}/></div>
        </div>
      </div>
      <div className="showcase-info"><span className="showcase-overline">{setName} · Nº {card.localId}</span><h2>{card.name}</h2><p>Maintiens et déplace la carte pour la faire pivoter. Glisse avec le doigt sur mobile.</p>
        <div className="showcase-actions"><button onClick={onToggle} className={owned?'showcase-owned':''}>{owned?'✓ Dans ma collection':'Ajouter à ma collection'}</button><a href={cardmarketUrl} target="_blank" rel="noopener noreferrer">Voir sur Cardmarket <ExternalLink size={15}/></a><button onClick={()=>setRotation({x:0,y:0})} aria-label="Recentrer la carte"><RotateCcw size={18}/></button></div>
      </div>
    </div>
  </div>, document.body)
}
