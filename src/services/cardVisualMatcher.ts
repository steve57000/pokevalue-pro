import { computeCardCrop, computeIllustrationCrop } from '../utils/camera'

export type VisualSignature = {
  luma: number[]
  color: number[]
  edges: number[]
}

export type VisualCandidate = {
  id: string
  imageUrl?: string
}

const SIGNATURE_WIDTH = 24
const SIGNATURE_HEIGHT = 34
const COLOR_CELL_SIZE = 3
const IMAGE_TIMEOUT_MS = 6000
const MAX_VISUAL_CANDIDATES = 24
const MAX_CONCURRENT_IMAGES = 4

function correlation(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0
  const leftMean = left.reduce((total, value) => total + value, 0) / left.length
  const rightMean = right.reduce((total, value) => total + value, 0) / right.length
  let numerator = 0
  let leftVariance = 0
  let rightVariance = 0

  for (let index = 0; index < left.length; index += 1) {
    const normalizedLeft = left[index] - leftMean
    const normalizedRight = right[index] - rightMean
    numerator += normalizedLeft * normalizedRight
    leftVariance += normalizedLeft * normalizedLeft
    rightVariance += normalizedRight * normalizedRight
  }

  if (leftVariance === 0 || rightVariance === 0) return 0
  return numerator / Math.sqrt(leftVariance * rightVariance)
}

export function compareVisualSignatures(
  source: VisualSignature,
  candidate: VisualSignature,
): number {
  const luma = Math.max(0, correlation(source.luma, candidate.luma))
  const color = Math.max(0, correlation(source.color, candidate.color))
  const edges = Math.max(0, correlation(source.edges, candidate.edges))
  return Math.round(Math.min(1, luma * 0.44 + color * 0.22 + edges * 0.34) * 100)
}

function signatureFromPixels(data: Uint8ClampedArray): VisualSignature {
  const luma: number[] = []
  const color: number[] = []

  for (let y = 1; y < SIGNATURE_HEIGHT - 1; y += 1) {
    for (let x = 1; x < SIGNATURE_WIDTH - 1; x += 1) {
      const offset = (y * SIGNATURE_WIDTH + x) * 4
      luma.push(data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114)
      if (x % COLOR_CELL_SIZE === 0 && y % COLOR_CELL_SIZE === 0) {
        color.push(data[offset], data[offset + 1], data[offset + 2])
      }
    }
  }

  const edges: number[] = []
  for (let y = 1; y < SIGNATURE_HEIGHT - 1; y += 1) {
    for (let x = 1; x < SIGNATURE_WIDTH - 1; x += 1) {
      const offset = (y * SIGNATURE_WIDTH + x) * 4
      const left = data[offset - 4] * 0.299 + data[offset - 3] * 0.587 + data[offset - 2] * 0.114
      const right = data[offset + 4] * 0.299 + data[offset + 5] * 0.587 + data[offset + 6] * 0.114
      const top = data[offset - SIGNATURE_WIDTH * 4] * 0.299 + data[offset - SIGNATURE_WIDTH * 4 + 1] * 0.587 + data[offset - SIGNATURE_WIDTH * 4 + 2] * 0.114
      const bottom = data[offset + SIGNATURE_WIDTH * 4] * 0.299 + data[offset + SIGNATURE_WIDTH * 4 + 1] * 0.587 + data[offset + SIGNATURE_WIDTH * 4 + 2] * 0.114
      edges.push(Math.abs(right - left) + Math.abs(bottom - top))
    }
  }

  return { luma, color, edges }
}

type DecodedImage = {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

async function decodeImage(image: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    } catch {
      // Some Safari versions expose createImageBitmap but reject orientation options.
    }
  }

  const objectUrl = URL.createObjectURL(image)
  try {
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image()
      candidate.decoding = 'async'
      candidate.onload = () => resolve(candidate)
      candidate.onerror = () => reject(new Error('Image impossible à comparer'))
      candidate.src = objectUrl
    })
    return {
      source: element,
      width: element.naturalWidth,
      height: element.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function createVisualSignature(image: Blob): Promise<VisualSignature> {
  const decoded = await decodeImage(image)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = SIGNATURE_WIDTH
    canvas.height = SIGNATURE_HEIGHT
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
    if (!context) throw new Error('Comparaison visuelle indisponible')

    const crop = decoded.width / decoded.height > 0.55 && decoded.width / decoded.height < 0.9
      ? computeIllustrationCrop(decoded.width, decoded.height)
      : computeCardCrop(decoded.width, decoded.height)
    context.drawImage(
      decoded.source,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      SIGNATURE_WIDTH,
      SIGNATURE_HEIGHT,
    )
    return signatureFromPixels(
      context.getImageData(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT).data,
    )
  } finally {
    decoded.dispose()
  }
}

async function fetchImage(url: string): Promise<Blob> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      cache: 'force-cache',
      mode: 'cors',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Image indisponible (${response.status})`)
    return await response.blob()
  } finally {
    window.clearTimeout(timeout)
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(values.length)
  let cursor = 0

  async function worker() {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      try {
        results[index] = { status: 'fulfilled', value: await mapper(values[index]) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => worker(),
    ),
  )
  return results
}

export async function compareCardImageToCandidates(
  sourceImage: Blob,
  candidates: VisualCandidate[],
): Promise<Map<string, number>> {
  if (typeof document === 'undefined') return new Map()
  const comparable = candidates
    .filter((candidate): candidate is Required<VisualCandidate> => Boolean(candidate.imageUrl))
    .slice(0, MAX_VISUAL_CANDIDATES)
  if (comparable.length === 0) return new Map()

  const sourceSignature = await createVisualSignature(sourceImage)
  const results = await mapWithConcurrency(
    comparable,
    MAX_CONCURRENT_IMAGES,
    async (candidate) => {
      const image = await fetchImage(candidate.imageUrl)
      const signature = await createVisualSignature(image)
      return {
        id: candidate.id,
        similarity: compareVisualSignatures(sourceSignature, signature),
      }
    },
  )

  return new Map(
    results
      .filter((result): result is PromiseFulfilledResult<{ id: string; similarity: number }> =>
        result.status === 'fulfilled')
      .map((result) => [result.value.id, result.value.similarity]),
  )
}
