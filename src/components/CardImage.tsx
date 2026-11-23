import { useEffect, useMemo, useState } from 'react'
import { buildCardAssetCandidates, isUsableCardFrontUrl } from '../domain/image'
import type { ExternalCard } from '../domain/cards'

type CardImageProps = {
  image?: string
  fallbackImage?: ExternalCard['fallbackImage']
  name: string
  quality: 'low' | 'high'
  className?: string
}

export function CardImage({ image, fallbackImage, name, quality, className }: CardImageProps) {
  const sources = useMemo(() => {
    const fallback = fallbackImage?.[quality]
    return [...new Set([...buildCardAssetCandidates(image, quality), fallback].filter(isUsableCardFrontUrl))]
  }, [fallbackImage, image, quality])
  const sourceKey = sources.join('|')
  const [sourceIndex, setSourceIndex] = useState(0)

  useEffect(() => setSourceIndex(0), [sourceKey])

  if (!sources[sourceIndex]) {
    return <div className={`card-image-placeholder ${className ?? ''}`} role="img" aria-label={`Image indisponible pour ${name}`}>Image indisponible</div>
  }

  const usingFallback = sources[sourceIndex] === fallbackImage?.[quality]
  return <img
    className={className}
    src={sources[sourceIndex]}
    alt={`${name} — scan de carte Pokémon${usingFallback ? ' en anglais' : ''}`}
    title={usingFallback ? `Image de secours · ${fallbackImage?.source}` : undefined}
    loading="lazy"
    decoding="async"
    onError={() => setSourceIndex((index) => index + 1)}
  />
}
