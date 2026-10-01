import { Heart } from 'lucide-react'

type Props = {favorite:boolean;onToggle:()=>void;variant?:'icon'|'label';className?:string}
export function FavoriteButton({favorite,onToggle,variant='icon',className=''}:Props){
  return <button type="button" className={`favorite-button ${variant==='label'?'favorite-label':''} ${favorite?'is-favorite':''} ${className}`} aria-pressed={favorite} title={favorite?'Retirer des favoris':'Ajouter aux favoris'} aria-label={favorite?'Retirer des favoris':'Ajouter aux favoris'} onClick={event=>{event.stopPropagation();onToggle()}}><Heart size={18} fill={favorite?'currentColor':'none'}/>{variant==='label'&&<span>{favorite?'Favori':'Ajouter aux favoris'}</span>}</button>
}
