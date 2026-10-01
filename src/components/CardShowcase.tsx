import {useEffect,useRef,useState,type PointerEvent} from 'react'
import {createPortal} from 'react-dom'
import {X,ExternalLink,FlipHorizontal2,BarChart3,Plus,Minus,CheckCircle2} from 'lucide-react'
import {CatalogueImage} from './CatalogueImage'
import type {SetCard} from '../api/sets'
import {useModalDialog} from '../hooks/useModalDialog'
import {FavoriteButton} from './FavoriteButton'
import {buildCardmarketUrl} from '../domain/cardmarket'
const POKEMON_CARD_BACK=`${import.meta.env.BASE_URL}images/pokemon-card-back.jpg`
export type Rotation={x:number;y:number}
export const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value))
export const dragOffset=(origin:{x:number;y:number},point:{x:number;y:number}):Rotation=>({x:clamp(-(point.y-origin.y)*.35,-36,36),y:clamp((point.x-origin.x)*.35,-36,36)})
export const pointerRotation=(origin:{x:number;y:number},point:{x:number;y:number}):Rotation=>({x:clamp(-(point.y-origin.y)*.65,-360,360),y:clamp((point.x-origin.x)*.65,-720,720)})
export const settleNearEdge=(angle:number,direction:number)=>{const edge=90+180*Math.round((angle-90)/180);if(Math.abs(angle-edge)>=18)return angle;return edge+(Math.sign(direction)||Math.sign(angle-edge)||1)*18}
export const cardTransform=(tilt:Rotation,drag:Rotation,side:'front'|'back')=>`rotateX(${tilt.x+drag.x}deg) rotateY(${(side==='back'?180:0)+tilt.y+drag.y}deg)`
type Props={card:SetCard;setName:string;owned:boolean;onToggle:()=>void;quantity?:number;favorite?:boolean;onFavorite?:()=>void;onIncrement?:()=>void;onDecrement?:()=>void;onDetails?:()=>void;onClose:()=>void}
export function CardFaces({card}:{card:SetCard}){return <><div className="showcase-face showcase-front"><CatalogueImage key={card.id} card={card} quality="high"/></div><div className="showcase-face showcase-back"><img src={POKEMON_CARD_BACK} alt="Dos officiel d’une carte Pokémon" draggable={false}/></div></>}
export function CardShowcase({card,setName,owned,onToggle,quantity=owned?1:0,favorite=false,onFavorite,onIncrement,onDecrement,onDetails,onClose}:Props){
 const [side,setSide]=useState<'front'|'back'>('front'),[dragging,setDragging]=useState(false)
 const cardRef=useRef<HTMLDivElement>(null),drag=useRef<Rotation>({x:0,y:0}),dragStart=useRef<Rotation>({x:0,y:0}),origin=useRef({x:0,y:0}),lastPoint=useRef({x:0,y:0}),lastDirection=useRef<Rotation>({x:0,y:0}),pointer=useRef<number|null>(null),frame=useRef<number>(),pending=useRef<Rotation>({x:0,y:0}),sideRef=useRef(side),dialogRef=useModalDialog(onClose)
 sideRef.current=side
 const paint=(offset=drag.current,animate=false)=>{const node=cardRef.current;if(!node)return;const radians=(value:number)=>value*Math.PI/180,edgeProximity=(value:number)=>{const edge=90+180*Math.round((value-90)/180);return clamp(1-Math.abs(value-edge)/24,0,1)},edge=Math.max(edgeProximity(offset.x),edgeProximity(offset.y)),reflection=Math.max(Math.abs(Math.sin(radians(offset.x))),Math.abs(Math.sin(radians(offset.y))));node.style.transition=animate?'transform 320ms cubic-bezier(.2,.85,.25,1)':'none';node.style.transform=cardTransform({x:0,y:0},offset,sideRef.current);node.style.setProperty('--light-x',`${clamp(50+Math.sin(radians(offset.y))*35,15,85)}%`);node.style.setProperty('--light-y',`${clamp(50-Math.sin(radians(offset.x))*35,15,85)}%`);node.style.setProperty('--shadow-x',`${clamp(Math.sin(radians(offset.y))*14,-14,14)}px`);node.style.setProperty('--shadow-y',`${clamp(28-Math.sin(radians(offset.x))*10,18,38)}px`);node.style.setProperty('--holo-angle',`${135+offset.y-offset.x}deg`);node.style.setProperty('--holo-strength',`${.1+reflection*.42}`);node.style.setProperty('--edge-progress',`${edge}`)}
 useEffect(()=>{paint(drag.current,true)},[side])
 useEffect(()=>{paint(drag.current,!dragging)},[dragging])
 useEffect(()=>()=>{if(frame.current)cancelAnimationFrame(frame.current)},[])
 const down=(event:PointerEvent<HTMLDivElement>)=>{pointer.current=event.pointerId;origin.current={x:event.clientX,y:event.clientY};lastPoint.current={...origin.current};lastDirection.current={x:0,y:0};dragStart.current={...drag.current};pending.current={...drag.current};event.currentTarget.setPointerCapture(event.pointerId);setDragging(true)}
 const move=(event:PointerEvent<HTMLDivElement>)=>{if(pointer.current!==event.pointerId)return;const point={x:event.clientX,y:event.clientY},step=pointerRotation(lastPoint.current,point);if(step.x)lastDirection.current.x=Math.sign(step.x);if(step.y)lastDirection.current.y=Math.sign(step.y);lastPoint.current=point;const delta=pointerRotation(origin.current,point);pending.current={x:clamp(dragStart.current.x+delta.x,-360,360),y:clamp(dragStart.current.y+delta.y,-720,720)};if(frame.current)return;frame.current=requestAnimationFrame(()=>{frame.current=undefined;drag.current=pending.current;paint()})}
 const up=(event:PointerEvent<HTMLDivElement>)=>{if(pointer.current!==event.pointerId)return;pointer.current=null;setDragging(false);if(frame.current){cancelAnimationFrame(frame.current);frame.current=undefined}const point={x:event.clientX,y:event.clientY},delta=pointerRotation(origin.current,point),final={x:clamp(dragStart.current.x+delta.x,-360,360),y:clamp(dragStart.current.y+delta.y,-720,720)};if(point.x!==lastPoint.current.x||point.y!==lastPoint.current.y){const step=pointerRotation(lastPoint.current,point);if(step.x)lastDirection.current.x=Math.sign(step.x);if(step.y)lastDirection.current.y=Math.sign(step.y)};drag.current={x:settleNearEdge(final.x,lastDirection.current.x),y:settleNearEdge(final.y,lastDirection.current.y)};pending.current=drag.current;lastPoint.current=point;paint(drag.current,true)}
 return createPortal(
  <div className="showcase-backdrop" role="presentation" onPointerDown={event=>{if(event.target===event.currentTarget)onClose()}}>
   <div ref={dialogRef as React.RefObject<HTMLDivElement>} className="showcase" role="dialog" aria-modal="true" aria-label={`${card.name}, ${setName}`}>
    <button className="showcase-close" onClick={onClose} aria-label="Fermer la carte"><X/></button>
    <div className="showcase-spotlight" aria-hidden="true"/>
    <div className="showcase-stage"><div ref={cardRef} className={`showcase-card ${dragging?'dragging':''}`} style={{transform:cardTransform({x:0,y:0},drag.current,side)}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><CardFaces card={card}/></div></div>
    <div className="showcase-info">
     <span className="showcase-overline">{setName} · Nº {card.localId}</span><h2>{card.name}</h2>
     <p>Glisse sur la carte pour la tourner librement ; maintiens sans bouger pour la garder face à toi.</p>
     <div className="showcase-actions">
      <button className="showcase-flip" onClick={()=>setSide(value=>{const next=value==='front'?'back':'front';sideRef.current=next;return next})}><FlipHorizontal2 size={18}/>{side==='front'?'Voir le verso':'Voir le recto'}</button>
      <div className="showcase-secondary">
       {owned&&onDecrement&&<button onClick={onDecrement} aria-label={`Retirer un exemplaire de ${card.name}`} title="Retirer un exemplaire"><Minus size={17}/></button>}
       {owned?<span className="showcase-owned"><CheckCircle2 size={17}/> ×{quantity}</span>:<button onClick={onToggle}>Ajouter à ma collection</button>}
       {owned&&onIncrement&&<button onClick={onIncrement} aria-label={`Ajouter un exemplaire de ${card.name}`} title="Ajouter un exemplaire"><Plus size={17}/>1</button>}
       {onFavorite&&<FavoriteButton favorite={favorite} onToggle={onFavorite}/>}
       {onDetails&&<button onClick={onDetails} aria-label="Détails et statistiques"><BarChart3 size={18}/></button>}
      </div>
      <a href={buildCardmarketUrl({...card,setName})} target="_blank" rel="noopener noreferrer">Voir sur Cardmarket <ExternalLink size={15}/></a>
     </div>
    </div>
   </div>
  </div>,document.body)
}
