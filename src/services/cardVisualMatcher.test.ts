import { describe, expect, it } from 'vitest'
import { compareVisualSignatures, type VisualSignature } from './cardVisualMatcher'

function signature(luma: number[], color = luma, edges = luma): VisualSignature {
  return { luma, color, edges }
}

describe('visual card matching', () => {
  it('gives an identical illustration the maximum similarity', () => {
    const source = signature([10, 30, 20, 80, 45, 5])
    expect(compareVisualSignatures(source, source)).toBe(100)
  })

  it('keeps a clearly different illustration below the visual evidence threshold', () => {
    const source = signature([10, 30, 20, 80, 45, 5])
    const different = signature([90, 5, 70, 10, 20, 80])
    expect(compareVisualSignatures(source, different)).toBeLessThan(56)
  })

  it('is robust to a uniform brightness change', () => {
    const source = signature([10, 30, 20, 80, 45, 5])
    const brighter = signature([30, 50, 40, 100, 65, 25])
    expect(compareVisualSignatures(source, brighter)).toBe(100)
  })
})
