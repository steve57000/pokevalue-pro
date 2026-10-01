import {useEffect,useRef} from 'react'

const focusable='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
export function useModalDialog(onClose:()=>void){
 const rootRef=useRef<HTMLElement>(null),closeRef=useRef(onClose);closeRef.current=onClose
 useEffect(()=>{
  const y=window.scrollY,trigger=document.activeElement as HTMLElement|null,previous=document.body.style.overflow
  document.body.style.overflow='hidden';requestAnimationFrame(()=>rootRef.current?.querySelector<HTMLElement>(focusable)?.focus())
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();closeRef.current()}if(event.key==='Tab'&&rootRef.current){const nodes=[...rootRef.current.querySelectorAll<HTMLElement>(focusable)];if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}}
  addEventListener('keydown',key)
  return()=>{removeEventListener('keydown',key);document.body.style.overflow=previous;requestAnimationFrame(()=>{window.scrollTo(0,y);trigger?.focus({preventScroll:true})})}
 },[])
 return rootRef
}
