import { useState } from 'react'
import { buildTcgDexImageUrl } from '../api/tcgdex'

export function CardImage({ image, name, quality, className }: { image?: string; name: string; quality: 'low' | 'high'; className?: string }) {
  const [failed, setFailed] = useState(false)
  const url = failed ? undefined : buildTcgDexImageUrl(image, quality)

  if (!url) {
    return <div className={`card-image-placeholder ${className ?? ''}`} role="img" aria-label={`Image indisponible pour ${name}`}>Image indisponible</div>
  }

  return <img className={className} src={url} alt={`${name} — scan de carte Pokémon`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
}
