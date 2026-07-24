export type CropRect = { sx: number; sy: number; sw: number; sh: number }

export type FrameQuality = {
  brightness: number
  sharpness: number
  status: 'good' | 'dark' | 'bright' | 'blurred'
  message: string
}

const CARD_RATIO = 63 / 88

export type OcrBand = CropRect & { dy: number; dh: number }

export function computeCardCrop(width: number, height: number, targetRatio = CARD_RATIO): CropRect {
  if (width <= 0 || height <= 0) throw new Error('Dimensions vidéo invalides')
  const sourceRatio = width / height
  if (sourceRatio > targetRatio) {
    const sw = height * targetRatio
    return { sx: (width - sw) / 2, sy: 0, sw, sh: height }
  }
  const sh = width / targetRatio
  return { sx: 0, sy: (height - sh) / 2, sw: width, sh }
}

export function computeOcrBands(width: number, height: number): OcrBand[] {
  const crop = computeCardCrop(width, height)
  const topHeight = crop.sh * 0.27
  const bottomHeight = crop.sh * 0.24
  return [
    { sx: crop.sx, sy: crop.sy, sw: crop.sw, sh: topHeight, dy: 0, dh: 400 },
    { sx: crop.sx, sy: crop.sy + crop.sh - bottomHeight, sw: crop.sw, sh: bottomHeight, dy: 430, dh: 360 },
  ]
}

function drawCardFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, width: number): CanvasRenderingContext2D {
  const crop = computeCardCrop(video.videoWidth, video.videoHeight)
  canvas.width = width
  canvas.height = Math.round(width / CARD_RATIO)
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
  if (!context) throw new Error('Canvas indisponible')
  context.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height)
  return context
}

export async function captureCardFrame(video: HTMLVideoElement): Promise<Blob> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
    throw new Error('La caméra n’est pas encore prête')
  }

  const canvas = document.createElement('canvas')
  const crop = computeCardCrop(video.videoWidth, video.videoHeight)
  const outputWidth = Math.min(1200, Math.round(crop.sw))
  drawCardFrame(video, canvas, Math.max(640, outputWidth))

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Impossible de capturer la photo'))),
      'image/jpeg',
      0.9,
    )
  })
}

type DecodedCardImage = {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

async function decodeCardImage(image: Blob): Promise<DecodedCardImage> {
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
      // Safari can expose createImageBitmap while rejecting its orientation options.
    }
  }

  const objectUrl = URL.createObjectURL(image)
  try {
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image()
      candidate.decoding = 'async'
      candidate.onload = () => resolve(candidate)
      candidate.onerror = () => reject(new Error('La photo sélectionnée ne peut pas être décodée.'))
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

export async function prepareCardOcrImage(image: Blob): Promise<Blob> {
  const decoded = await decodeCardImage(image)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1400
    canvas.height = 810
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return image
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.filter = 'grayscale(1) contrast(1.7)'
    for (const band of computeOcrBands(decoded.width, decoded.height)) {
      context.drawImage(decoded.source, band.sx, band.sy, band.sw, band.sh, 0, band.dy, canvas.width, band.dh)
    }
    context.filter = 'none'

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? image), 'image/jpeg', 0.92)
    })
  } finally {
    decoded.dispose()
  }
}

export async function prepareCardNumberOcrImage(image: Blob): Promise<Blob> {
  const decoded = await decodeCardImage(image)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1800
    canvas.height = 520
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
    if (!context) return image

    const crop = computeCardCrop(decoded.width, decoded.height)
    const bandHeight = crop.sh * 0.2
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.filter = 'grayscale(1) contrast(2.1)'
    context.drawImage(
      decoded.source,
      crop.sx,
      crop.sy + crop.sh - bandHeight,
      crop.sw,
      bandHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    context.filter = 'none'

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    let total = 0
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      total += pixels.data[offset]
    }
    const threshold = Math.max(95, Math.min(205, total / (pixels.data.length / 4) - 18))
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      const value = pixels.data[offset] < threshold ? 0 : 255
      pixels.data[offset] = value
      pixels.data[offset + 1] = value
      pixels.data[offset + 2] = value
    }
    context.putImageData(pixels, 0, 0)

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? image), 'image/png')
    })
  } finally {
    decoded.dispose()
  }
}

export function assessCardFrame(video: HTMLVideoElement): FrameQuality {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
    return { brightness: 0, sharpness: 0, status: 'blurred', message: 'Initialisation de la caméra…' }
  }

  const canvas = document.createElement('canvas')
  const context = drawCardFrame(video, canvas, 128)
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const grayscale = new Float32Array(canvas.width * canvas.height)
  let brightness = 0

  for (let index = 0; index < grayscale.length; index += 1) {
    const offset = index * 4
    const value = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114
    grayscale[index] = value
    brightness += value
  }
  brightness /= grayscale.length

  let laplacianTotal = 0
  let laplacianSquared = 0
  let samples = 0
  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < canvas.width - 1; x += 1) {
      const index = y * canvas.width + x
      const laplacian =
        grayscale[index - 1] +
        grayscale[index + 1] +
        grayscale[index - canvas.width] +
        grayscale[index + canvas.width] -
        4 * grayscale[index]
      laplacianTotal += laplacian
      laplacianSquared += laplacian * laplacian
      samples += 1
    }
  }
  const mean = laplacianTotal / samples
  const sharpness = laplacianSquared / samples - mean * mean

  if (brightness < 55) return { brightness, sharpness, status: 'dark', message: 'Ajoute de la lumière' }
  if (brightness > 225) return { brightness, sharpness, status: 'bright', message: 'Évite les reflets' }
  if (sharpness < 85) return { brightness, sharpness, status: 'blurred', message: 'Stabilise le téléphone' }
  return { brightness, sharpness, status: 'good', message: 'Carte bien cadrée' }
}

export function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}
