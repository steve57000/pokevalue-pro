import { describe, expect, it } from 'vitest'
import { mapOcrProgress } from './cardOcr'

describe('OCR progress', () => {
  it('translates known worker statuses and clamps progress', () => {
    expect(mapOcrProgress({ status: 'recognizing text', progress: 1.2 })).toEqual({
      progress: 1,
      message: 'Lecture du nom et du numéro',
    })
  })

  it('keeps an understandable fallback for a new worker status', () => {
    expect(mapOcrProgress({ status: 'future status', progress: 0.4 }).message).toBe('Analyse de la carte')
  })
})
