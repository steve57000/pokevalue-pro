import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MarketPriceDisplay } from './MarketPriceDisplay'

describe('market price display by catalogue language', () => {
  it('keeps the European EUR and North American USD references separate for English cards', () => {
    const html = renderToStaticMarkup(createElement(MarketPriceDisplay, {
      language: 'en',
      status: 'success',
      cardmarket: { value: 12, currency: 'EUR', label: 'Tendance Cardmarket', provider: 'cardmarket' },
      tcgplayer: { value: 8, currency: 'USD', label: 'Marché TCGplayer', provider: 'tcgplayer', region: 'Amérique du Nord' },
    }))
    expect(html).toContain('Cardmarket')
    expect(html).toContain('Europe · EUR')
    expect(html).toContain('12')
    expect(html).toContain('TCGplayer')
    expect(html).toContain('Amérique du Nord · USD · Marché TCGplayer')
    expect(html).toContain('8')
    expect(html).toContain('pas le Royaume-Uni')
  })

  it('shows when a French card uses an unfiltered European reference', () => {
    const html = renderToStaticMarkup(createElement(MarketPriceDisplay, {
      language: 'fr',
      status: 'success',
      cardmarket: { value: 12, currency: 'EUR', label: 'Tendance Cardmarket', provider: 'cardmarket' },
    }))
    expect(html).toContain('langue et impression non filtrées : pas une cote française')
    expect(html).not.toContain('TCGplayer')
  })

  it('shows an English TCGplayer quote when Cardmarket has no price', () => {
    const html = renderToStaticMarkup(createElement(MarketPriceDisplay, {
      language: 'en',
      status: 'success',
      tcgplayer: { value: 4.25, currency: 'USD', label: 'Prix intermédiaire TCGplayer', provider: 'tcgplayer', region: 'Amérique du Nord' },
    }))
    expect(html).toContain('TCGplayer')
    expect(html).toContain('Prix intermédiaire TCGplayer')
    expect(html).toContain('$US')
    expect(html).toContain('Indisponible')
  })

  it('never presents a European reference as a local Japanese quote', () => {
    const html = renderToStaticMarkup(createElement(MarketPriceDisplay, {
      language: 'ja',
      status: 'success',
      cardmarket: { value: 12, currency: 'EUR', label: 'Tendance Cardmarket', provider: 'cardmarket' },
    }))
    expect(html).toContain('Cote locale')
    expect(html).toContain('Japon')
    expect(html).toContain('Indisponible')
    expect(html).toContain('Référence Cardmarket')
    expect(html).toContain('Cardmarket Europe est séparé du marché asiatique')
  })
})
