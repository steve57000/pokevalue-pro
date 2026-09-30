import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'

export function ScrollToTop({ hidden = false }: { hidden?: boolean }) {
  const [visible,setVisible] = useState(false)
  useEffect(()=>{const update=()=>setVisible(window.scrollY>500);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update)},[])
  if (!visible || hidden) return null
  return <button className="scroll-top" aria-label="Revenir en haut de la page" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><ChevronUp/></button>
}
