import type { LoggerMessage, Worker } from 'tesseract.js'
import type { ScanLanguage } from '../domain/scanner'

export type OcrProgress = {
  progress: number
  message: string
}

export type OcrResult = {
  text: string
  confidence: number
}

let workerPromise: Promise<Worker> | undefined
let workerLanguage: ScanLanguage | undefined
let activeProgress: ((progress: OcrProgress) => void) | undefined

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Chargement du moteur OCR',
  'initializing tesseract': 'Initialisation du moteur',
  'loading language traineddata': 'Chargement du modèle de langue',
  'initializing api': 'Préparation de la reconnaissance',
  'recognizing text': 'Lecture du nom et du numéro',
}

export function mapOcrProgress(message: Pick<LoggerMessage, 'status' | 'progress'>): OcrProgress {
  return {
    progress: Number.isFinite(message.progress) ? Math.max(0, Math.min(1, message.progress)) : 0,
    message: STATUS_LABELS[message.status] ?? 'Analyse de la carte',
  }
}

async function createOcrWorker(language: ScanLanguage): Promise<Worker> {
  const { createWorker, PSM } = await import('tesseract.js')
  const worker = await createWorker(language === 'fr' ? 'fra' : 'eng', undefined, {
    logger: (message) => activeProgress?.(mapOcrProgress(message)),
  })
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  })
  return worker
}

async function getOcrWorker(language: ScanLanguage): Promise<Worker> {
  if (workerPromise && workerLanguage === language) return workerPromise
  if (workerPromise) {
    try {
      const previous = await workerPromise
      await previous.terminate()
    } catch {
      // A failed worker is replaced below.
    }
  }
  workerLanguage = language
  workerPromise = createOcrWorker(language)
  return workerPromise
}

export async function recognizeCardText(
  image: Blob,
  language: ScanLanguage,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  activeProgress = onProgress
  try {
    const worker = await getOcrWorker(language)
    const result = await worker.recognize(image, { rotateAuto: true })
    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
    }
  } finally {
    activeProgress = undefined
  }
}

export async function terminateCardOcr(): Promise<void> {
  if (!workerPromise) return
  try {
    const worker = await workerPromise
    await worker.terminate()
  } finally {
    workerPromise = undefined
    workerLanguage = undefined
    activeProgress = undefined
  }
}
