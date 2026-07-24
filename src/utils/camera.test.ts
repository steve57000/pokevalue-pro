import { describe, expect, it } from 'vitest'
import { computeCardCrop, computeOcrBands } from './camera'

describe('camera crop', () => {
  it('centers a portrait card inside a landscape video', () => {
    const crop = computeCardCrop(1920, 1080)
    expect(crop.sh).toBe(1080)
    expect(crop.sw).toBeCloseTo(773.18, 1)
    expect(crop.sx).toBeCloseTo((1920 - crop.sw) / 2)
  })

  it('centers a portrait card inside a portrait video', () => {
    const crop = computeCardCrop(1080, 1920)
    expect(crop.sw).toBe(1080)
    expect(crop.sh).toBeCloseTo(1508.57, 1)
    expect(crop.sy).toBeGreaterThan(0)
  })

  it('rejects invalid dimensions', () => {
    expect(() => computeCardCrop(0, 1080)).toThrow('Dimensions vidéo invalides')
  })

  it('keeps top and bottom OCR bands inside the centered card crop', () => {
    const crop = computeCardCrop(1920, 1080)
    const bands = computeOcrBands(1920, 1080)
    expect(bands).toHaveLength(2)
    expect(bands[0].sy).toBeGreaterThan(crop.sy)
    expect(bands[1].sy + bands[1].sh).toBeLessThan(crop.sy + crop.sh)
    expect(bands[0].sx).toBeGreaterThan(crop.sx)
    expect(bands[1].sw).toBeLessThan(crop.sw)
  })
})
