import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {CardImage} from './CardImage'
it('never uses a card back or an unsupported cached English path as a scanner front',()=>{
 const html=renderToStaticMarkup(<CardImage name="Carte" quality="low" image="/images/pokemon-card-back.webp" fallbackImage={{low:'https://images.pokemontcg.io/me06/138.png',high:'https://images.pokemontcg.io/me06/138_hires.png',source:'Pokémon TCG API'}}/>)
 expect(html).not.toContain('<img')
 expect(html).toContain('Image indisponible')
})
it('keeps a complete front URL and labels an English fallback',()=>{
 const front=renderToStaticMarkup(<CardImage name="Carte" quality="high" image="https://assets.tcgdex.net/fr/me/me06/138/high.webp"/>)
 expect(front).toContain('src="https://assets.tcgdex.net/fr/me/me06/138/high.webp"')
 const fallback=renderToStaticMarkup(<CardImage name="Carte" quality="low" fallbackImage={{low:'https://images.scrydex.com/pokemon/me6-138/small',high:'https://images.scrydex.com/pokemon/me6-138/large',source:'Pokémon TCG API'}}/>)
 expect(fallback).toContain('en anglais')
})
