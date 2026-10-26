import { useLayoutEffect, useRef, useState } from 'react'

type Props = { sources: string[]; name: string; imageClass: string; fallbackClass: string; eager?: boolean }
export function SetBadge(props: Props) {
  return <BadgeImage key={props.sources.join('|')} {...props}/>
}
function BadgeImage({ sources, name, imageClass, fallbackClass, eager }: Props) {
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const image = useRef<HTMLImageElement>(null)
  const src = sources[index]
  useLayoutEffect(() => { setLoaded(Boolean(image.current?.complete && image.current.naturalWidth)) }, [src])
  const mark = name.match(/30|[A-ZÀ-Þ]{2}/i)?.[0] ?? name.slice(0, 2).toUpperCase()
  return <span className={src ? 'set-badge-wrap' : fallbackClass} aria-label={src ? undefined : `Repère ${name}`}>
    {src ? <>
      <img key={src} ref={image} className={imageClass} src={src} alt={`Logo ${name}`} loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setIndex(value => value + 1) }}/>
      {!loaded && <span className="pv-spinner set-badge-spinner" role="status" aria-label={`Chargement du logo ${name}`}/>}
    </> : mark}
  </span>
}
