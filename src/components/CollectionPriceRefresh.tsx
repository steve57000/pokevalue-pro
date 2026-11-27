import type {CollectionEntry} from '../domain/collection'
import {useCardPrices} from '../hooks/useCardPrices'

/** Keep owned prices current in every view without rerendering the whole app. */
export function CollectionPriceRefresh({entries}:{entries:CollectionEntry[]}) {
  const ids=(language:string)=>entries.filter(entry=>entry.quantity>0&&entry.language===language&&entry.variant==='normal'&&entry.setId!=='jumbo').map(entry=>entry.cardId)
  useCardPrices(ids('fr'),'fr')
  useCardPrices(ids('en'),'en')
  return null
}
