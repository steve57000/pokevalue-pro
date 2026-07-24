import type { LoggerMessage, Worker } from 'tesseract.js'
import ocrWorkerUrl from 'tesseract.js/dist/worker.min.js?url'
import type { CardLanguage, ScanLanguage } from '../domain/scanner'

export type OcrProgress = {
  progress: number
  message: string
}

export type OcrResult = {
  text: string
  confidence: number
}

let workerPromise: Promise<Worker> | undefined
let workerLanguage: CardLanguage | undefined
let activeProgress: ((progress: OcrProgress) => void) | undefined
let activeStage: 'text' | 'number' = 'text'

const TESSERACT_CORE_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0'
const TESSERACT_LANGUAGE_VERSION = '4.0.0_best_int'

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

async function createOcrWorker(language: CardLanguage): Promise<Worker> {
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const languageCode = language === 'fr' ? 'fra' : 'eng'
  const worker = await createWorker(languageCode, OEM.LSTM_ONLY, {
    workerPath: ocrWorkerUrl,
    workerBlobURL: false,
    corePath: TESSERACT_CORE_PATH,
    langPath: `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${languageCode}/${TESSERACT_LANGUAGE_VERSION}`,
    logger: (message) => {
      const progress = mapOcrProgress(message)
      activeProgress?.({
        ...progress,
        message: activeStage === 'number' && message.status === 'recognizing text'
          ? 'Lecture du numéro imprimé'
          : progress.message,
      })
    },
  })
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  })
  return worker
}

async function getOcrWorker(language: ScanLanguage): Promise<Worker> {
  const resolvedLanguage: CardLanguage = language === 'auto' ? 'fr' : language
  if (workerPromise && workerLanguage === resolvedLanguage) return workerPromise
  if (workerPromise) await terminateCardOcr()

  workerLanguage = resolvedLanguage
  const creation = createOcrWorker(resolvedLanguage)
  workerPromise = creation
  try {
    return await creation
  } catch (error) {
    if (workerPromise === creation) {
      workerPromise = undefined
      workerLanguage = undefined
    }
    throw error
  }
}

function readableOcrError(error: unknown): Error {
  const technicalMessage = error instanceof Error ? error.message : String(error)
  if (/fetch|network|load|worker|wasm|importscripts/i.test(technicalMessage)) {
    return new Error('Le moteur de reconnaissance n’a pas pu se charger. Vérifie la connexion puis réessaie.')
  }
  return new Error(`La lecture de la photo a échoué${technicalMessage ? ` : ${technicalMessage}` : '.'}`)
}

export async function recognizeCardText(
  image: Blob,
  language: ScanLanguage,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  activeProgress = onProgress
  activeStage = 'text'
  try {
    const { PSM } = await import('tesseract.js')
    const worker = await getOcrWorker(language)
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      tessedit_char_whitelist: '',
      preserve_interword_spaces: '1',
    })
    const result = await worker.recognize(image, { rotateAuto: true })
    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
    }
  } catch (error) {
    await terminateCardOcr()
    throw readableOcrError(error)
  } finally {
    activeProgress = undefined
  }
}

export async function recognizeCardNumber(
  image: Blob,
  language: ScanLanguage,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  activeProgress = onProgress
  activeStage = 'number'
  try {
    const { PSM } = await import('tesseract.js')
    const worker = await getOcrWorker(language)
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/- ',
      preserve_interword_spaces: '1',
    })
    const result = await worker.recognize(image)
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      tessedit_char_whitelist: '',
      preserve_interword_spaces: '1',
    })
    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
    }
  } catch (error) {
    await terminateCardOcr()
    throw readableOcrError(error)
  } finally {
    activeProgress = undefined
    activeStage = 'text'
  }
}

export async function terminateCardOcr(): Promise<void> {
  if (!workerPromise) return
  const currentWorker = workerPromise
  workerPromise = undefined
  workerLanguage = undefined
  activeProgress = undefined
  activeStage = 'text'
  try {
    const worker = await currentWorker
    await worker.terminate()
  } catch {
    // A rejected or crashed worker has no remaining resource that can be reused.
  }
}
