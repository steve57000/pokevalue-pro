import { useState, type Dispatch, type SetStateAction } from 'react'
import { findCollectionEntry, updateCollectionCard, type CollectionCard, type CollectionDocument } from '../domain/collection'
import { isAsianCatalogLanguage } from '../domain/pricing'
import { useCardPrices } from '../hooks/useCardPrices'
import { CardShowcase } from './CardShowcase'
import { CardDetailsModal } from './CardDetailsModal'
import { CardEditor } from './CardEditor'

type Props = { card: CollectionCard; document: CollectionDocument; onChange: Dispatch<SetStateAction<CollectionDocument>>; initialView: 'showcase' | 'details'; favorite: boolean; onFavorite: () => void; onClose: () => void }
export function CardWorkspace({ card, document, onChange, initialView, favorite, onFavorite, onClose }: Props) {
  const [view, setView] = useState<'showcase' | 'details' | 'edit'>(initialView)
  const saved = findCollectionEntry(document, card), entry = saved?.quantity ? saved : undefined
  const jumbo = card.setId === 'jumbo'
  const prices = useCardPrices(jumbo ? [] : [card.cardId], card.language), price = jumbo ? undefined : prices[card.cardId]
  const displayCard = { id: card.cardId, name: card.name, localId: card.number ?? '', image: card.image ?? saved?.image, rarity: card.rarity ?? saved?.rarity }
  const changeQuantity = (delta: number) => onChange(current => updateCollectionCard(current, card, { quantity: Math.max(0, (findCollectionEntry(current, card)?.quantity ?? 0) + delta) }))
  if (view === 'edit') return <CardEditor card={displayCard} setName={card.setName} language={card.language} entry={entry} automaticPrice={jumbo || isAsianCatalogLanguage(card.language) ? undefined : price?.price} onSave={draft => { onChange(current => updateCollectionCard(current, card, draft)); setView('details') }} onRemove={() => { onChange(current => updateCollectionCard(current, card, { quantity: 0 })); setView('details') }} onClose={() => setView('details')}/>
  if (view === 'details') return <CardDetailsModal card={displayCard} setName={card.setName} language={card.language} entry={entry} price={price} jumbo={jumbo} favorite={favorite} onFavorite={onFavorite} onQuantity={quantity => onChange(current => updateCollectionCard(current, card, { quantity }))} onEdit={() => setView('edit')} onShowcase={() => setView('showcase')} onClose={onClose}/>
  return <CardShowcase card={displayCard} setName={card.setName} requestedLanguage={card.language} owned={Boolean(entry)} quantity={entry?.quantity} onToggle={() => changeQuantity(1)} onIncrement={() => changeQuantity(1)} onDecrement={() => changeQuantity(-1)} favorite={favorite} onFavorite={onFavorite} onDetails={() => setView('details')} onClose={onClose}/>
}
