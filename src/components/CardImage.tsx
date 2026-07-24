import { useEffect, useMemo, useState } from 'react'
import { buildTcgDexImageUrl } from '../api/tcgdex'
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
    const tcgDexWebp = buildTcgDexImageUrl(image, quality)
    const tcgDexPng = image ? `${image}/${quality}.png` : undefined
    const fallback = fallbackImage?.[quality]
    return [tcgDexWebp, tcgDexPng, fallback].filter((url): url is string => Boolean(url))
  }, [fallbackImage, image, quality])
  const sourceKey = sources.join('|')
  const [sourceIndex, setSourceIndex] = useState(0)

  useEffect(() => setSourceIndex(0), [sourceKey])

  if (!sources[sourceIndex]) {
    return <div className={`card-image-placeholder ${className ?? ''}`} role="img" aria-label={`Image indisponible pour ${name}`}>Image indisponible</div>
  }

  const usingFallback = sourceIndex === sources.length - 1 && Boolean(fallbackImage?.[quality])
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
