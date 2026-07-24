import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Library,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Upload,
  Zap,
} from 'lucide-react'
import { searchTcgDexCards } from '../api/tcgdex'
import {
  hasReliableBestMatch,
  matchStrength,
  parseCardScanText,
  type ScannerCandidate,
  type ScanLanguage,
} from '../domain/scanner'
import {
  recognizeCardNumber,
  recognizeCardText,
  terminateCardOcr,
  type OcrProgress,
} from '../services/cardOcr'
import {
  assessCardFrame,
  captureCardFrame,
  isCameraSupported,
  prepareCardNumberOcrImage,
  prepareCardOcrImage,
  type FrameQuality,
} from '../utils/camera'
import { CardImage } from './CardImage'
import { LivePrice } from './LivePrice'

type CameraState = 'idle' | 'starting' | 'active' | 'error'
type ScanState = 'idle' | 'capturing' | 'ocr' | 'searching' | 'done' | 'error'

type CardScannerProps = {
  recentCards: ScannerCandidate[]
  isCollected: (tcgdexId: string) => boolean
  onRemember: (candidate: ScannerCandidate) => void
  onToggleCollection: (candidate: ScannerCandidate) => void
}

const DEFAULT_QUALITY: FrameQuality = {
  brightness: 0,
  sharpness: 0,
  status: 'blurred',
  message: 'Place la carte dans le cadre',
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Accès caméra refusé. Autorise la caméra dans les réglages du navigateur.'
    if (error.name === 'NotFoundError') return 'Aucune caméra compatible n’a été trouvée.'
    if (error.name === 'NotReadableError') return 'La caméra est déjà utilisée par une autre application.'
  }
  return error instanceof Error ? error.message : 'Impossible d’ouvrir la caméra.'
}

export function CardScanner({
  recentCards,
  isCollected,
  onRemember,
  onToggleCollection,
}: CardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const lastAutoScanRef = useRef(0)
  const lastImageRef = useRef<Blob>()
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [cameraError, setCameraError] = useState<string>()
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [quality, setQuality] = useState(DEFAULT_QUALITY)
  const [continuous, setContinuous] = useState(false)
  const [language, setLanguage] = useState<ScanLanguage>('auto')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanError, setScanError] = useState<string>()
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({ progress: 0, message: 'Préparation' })
  const [ocrText, setOcrText] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [candidates, setCandidates] = useState<ScannerCandidate[]>([])
  const [confirmedId, setConfirmedId] = useState<string>()
  const [manualName, setManualName] = useState('')
  const [manualNumber, setManualNumber] = useState('')

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = undefined
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState('idle')
    setTorchAvailable(false)
    setTorchEnabled(false)
    setContinuous(false)
    setQuality(DEFAULT_QUALITY)
  }, [])

  const startCamera = useCallback(async (nextFacingMode = facingMode) => {
    setCameraError(undefined)
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setCameraState('error')
      setCameraError('La caméra nécessite une connexion HTTPS sécurisée.')
      return
    }
    if (!isCameraSupported()) {
      setCameraState('error')
      setCameraError('Ce navigateur ne permet pas l’accès direct à la caméra. Utilise « Prendre ou importer une photo ».')
      return
    }

    stopCamera()
    setCameraState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('Lecteur caméra indisponible')
      video.srcObject = stream
      await video.play()

      const track = stream.getVideoTracks()[0]
      try {
        const capabilities = typeof track.getCapabilities === 'function'
          ? track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
          : undefined
        setTorchAvailable(Boolean(capabilities?.torch))
      } catch {
        // Camera access must remain usable when a browser cannot expose capabilities.
        setTorchAvailable(false)
      }
      setFacingMode(nextFacingMode)
      setCameraState('active')
    } catch (error) {
      stopCamera()
      setCameraState('error')
      setCameraError(cameraErrorMessage(error))
    }
  }, [facingMode, stopCamera])

  useEffect(() => {
    return () => {
      stopCamera()
      void terminateCardOcr()
    }
  }, [stopCamera])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (cameraState !== 'active') return
    const interval = window.setInterval(() => {
      const video = videoRef.current
      if (!video) return
      try {
        setQuality(assessCardFrame(video))
      } catch {
        setQuality(DEFAULT_QUALITY)
      }
    }, 850)
    return () => window.clearInterval(interval)
  }, [cameraState])

  const analyzeImage = useCallback(async (image: Blob) => {
    if (busyRef.current) return
    busyRef.current = true
    lastImageRef.current = image
    setCandidates([])
    setConfirmedId(undefined)
    setScanError(undefined)
    setOcrText('')
    setScanState('ocr')
    setOcrProgress({ progress: 0, message: 'Chargement du moteur OCR' })

    try {
      const preparedImage = await prepareCardOcrImage(image)
      const ocr = await recognizeCardText(preparedImage, language, setOcrProgress)
      let mergedOcrText = ocr.text
      let clues = parseCardScanText(mergedOcrText)
      if (!clues.localId) {
        try {
          const numberImage = await prepareCardNumberOcrImage(image)
          const numberOcr = await recognizeCardNumber(numberImage, language, setOcrProgress)
          if (numberOcr.text) {
            mergedOcrText = `${mergedOcrText}\n${numberOcr.text}`.trim()
            clues = parseCardScanText(mergedOcrText)
          }
        } catch {
          // A readable name is enough to continue with bilingual and visual matching.
        }
      }
      setOcrText(mergedOcrText)
      setManualName(clues.nameHints[0] ?? '')
      setManualNumber(clues.localId ?? '')
      if (!clues.localId && clues.nameHints.length === 0) {
        throw new Error('Le nom ou le numéro n’est pas assez lisible. Reprends la photo ou utilise la recherche manuelle.')
      }

      setScanState('searching')
      const matches = await searchTcgDexCards(clues, language, { image })
      if (matches.length === 0) {
        throw new Error('Aucune correspondance suffisamment fiable. Vérifie les indices préremplis ou reprends une photo plus nette.')
      }
      setCandidates(matches)
      setScanState('done')
      setContinuous(false)
    } catch (error) {
      setScanState('error')
      setScanError(error instanceof Error ? error.message : 'La reconnaissance a échoué.')
      setContinuous(false)
    } finally {
      busyRef.current = false
    }
  }, [language])

  const captureAndAnalyze = useCallback(async () => {
    if (busyRef.current || !videoRef.current) return
    lastImageRef.current = undefined
    setScanState('capturing')
    setScanError(undefined)
    try {
      const image = await captureCardFrame(videoRef.current)
      setPreviewUrl(URL.createObjectURL(image))
      await analyzeImage(image)
    } catch (error) {
      setScanState('error')
      setScanError(error instanceof Error ? error.message : 'La capture a échoué.')
      busyRef.current = false
    }
  }, [analyzeImage])

  useEffect(() => {
    if (!continuous || cameraState !== 'active' || quality.status !== 'good' || busyRef.current) return
    const now = Date.now()
    if (now - lastAutoScanRef.current < 7000) return
    lastAutoScanRef.current = now
    void captureAndAnalyze()
  }, [cameraState, captureAndAnalyze, continuous, quality])

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchEnabled
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchEnabled(next)
    } catch {
      setTorchAvailable(false)
    }
  }

  async function switchCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    await startCamera(next)
  }

  async function importImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setScanError('Le fichier sélectionné n’est pas une image.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setScanError('La photo dépasse 15 Mo. Choisis une image plus légère.')
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
    await analyzeImage(file)
  }

  async function manualSearch() {
    if (!manualName.trim() && !manualNumber.trim()) {
      setScanError('Saisis au moins le nom ou le numéro visible sur la carte.')
      return
    }
    if (busyRef.current) return
    lastImageRef.current = undefined
    busyRef.current = true
    setScanError(undefined)
    setCandidates([])
    setConfirmedId(undefined)
    setScanState('searching')
    try {
      const matches = await searchTcgDexCards({
        rawText: `${manualName}\n${manualNumber}`,
        nameHints: manualName.trim() ? [manualName.trim()] : [],
        localId: manualNumber.trim() || undefined,
      }, language)
      if (matches.length === 0) throw new Error('Aucune carte trouvée avec ces informations.')
      setCandidates(matches)
      setScanState('done')
    } catch (error) {
      setScanState('error')
      setScanError(error instanceof Error ? error.message : 'La recherche a échoué.')
    } finally {
      busyRef.current = false
    }
  }

  const isBusy = scanState === 'capturing' || scanState === 'ocr' || scanState === 'searching'

  return (
    <section className="scanner-page">
      <div className="scanner-heading">
        <div>
          <span className="eyebrow"><ScanLine size={16}/> Scanner mobile</span>
          <h1>Reconnaître une carte avec la caméra</h1>
          <p>Cadre une seule carte, face avant, bien à plat. PokéValue lit localement son nom et son numéro, puis recherche les correspondances TCGdex.</p>
        </div>
        <label className="language-select">
          Langue de la carte
          <select value={language} onChange={(event) => setLanguage(event.target.value as ScanLanguage)} disabled={isBusy}>
            <option value="auto">Automatique (FR + EN)</option>
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </label>
      </div>

      <div className="scanner-layout">
        <div className="scanner-camera-card">
          <div className={`camera-viewport ${cameraState}`}>
            <video ref={videoRef} autoPlay muted playsInline aria-label="Aperçu de la caméra"/>
            {cameraState !== 'active' && (
              <div className="camera-empty">
                <Camera size={42}/>
                <strong>{cameraState === 'starting' ? 'Ouverture de la caméra…' : 'Caméra arrêtée'}</strong>
                <span>La caméra ne démarre qu’après ton autorisation.</span>
              </div>
            )}
            {cameraState === 'active' && (
              <>
                <div className="card-guide" aria-hidden="true"><span/><span/><span/><span/></div>
                <div className={`quality-badge ${quality.status}`}>
                  <i/>{quality.message}
                </div>
              </>
            )}
          </div>

          {cameraError && <div className="scanner-alert error"><AlertTriangle size={18}/><span>{cameraError}</span></div>}

          <div className="camera-controls">
            {cameraState !== 'active'
              ? <button className="primary-action" onClick={() => void startCamera()} disabled={cameraState === 'starting'}><Camera size={18}/> Ouvrir la caméra</button>
              : <button className="primary-action" onClick={() => void captureAndAnalyze()} disabled={isBusy}><ScanLine size={18}/> Scanner maintenant</button>}
            <button onClick={() => fileInputRef.current?.click()} disabled={isBusy}><Upload size={18}/> Prendre ou importer une photo</button>
            {cameraState === 'active' && <button onClick={() => void switchCamera()} disabled={isBusy}><RefreshCw size={18}/> Changer</button>}
            {cameraState === 'active' && torchAvailable && <button className={torchEnabled ? 'active-control' : ''} onClick={() => void toggleTorch()}><Zap size={18}/> Flash</button>}
          </div>

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => void importImage(event)}
          />

          {cameraState === 'active' && (
            <label className="continuous-toggle">
              <input type="checkbox" checked={continuous} onChange={(event) => setContinuous(event.target.checked)} disabled={isBusy}/>
              <span><strong>Reconnaissance continue</strong><small>Analyse automatiquement lorsque l’image est nette, puis se met en pause.</small></span>
            </label>
          )}
        </div>

        <div className="scanner-analysis-card" aria-live="polite">
          <div className="analysis-title">
            <div><span>Analyse</span><strong>{isBusy ? 'En cours' : scanState === 'done' ? 'Résultat disponible' : 'Prête'}</strong></div>
            <ShieldCheck size={25}/>
          </div>

          {previewUrl
            ? <img className="scan-preview" src={previewUrl} alt="Aperçu de la carte capturée"/>
            : <div className="scan-placeholder"><ScanLine size={32}/><span>L’aperçu de la carte apparaîtra ici.</span></div>}

          {isBusy && (
            <div className="scan-progress">
              <div><LoaderCircle className="spin" size={18}/><span>{scanState === 'capturing' ? 'Capture de la carte' : scanState === 'searching' ? 'Recherche dans TCGdex' : ocrProgress.message}</span></div>
              <progress max="1" value={scanState === 'ocr' ? ocrProgress.progress : undefined}/>
              {scanState === 'ocr' && <small>Le premier scan peut prendre quelques secondes. Le nom et le petit numéro sont analysés séparément pour gagner en précision.</small>}
            </div>
          )}

          {scanError && <div className="scanner-alert error">
            <AlertTriangle size={18}/>
            <span>{scanError}</span>
            {lastImageRef.current && <button onClick={() => {
              const image = lastImageRef.current
              if (!image) return
              void terminateCardOcr().then(() => analyzeImage(image))
            }} disabled={isBusy}><RefreshCw size={15}/> Réessayer l’analyse</button>}
          </div>}
          {ocrText && <details className="ocr-details"><summary>Texte détecté</summary><pre>{ocrText}</pre></details>}

          <div className="manual-search">
            <div><Search size={17}/><strong>Recherche assistée</strong></div>
            <p>Les indices détectés sont préremplis. Corrige le nom ou le numéro si nécessaire.</p>
            <div className="manual-fields">
              <input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Nom, ex. Dracaufeu"/>
              <input value={manualNumber} onChange={(event) => setManualNumber(event.target.value)} placeholder="Numéro, ex. 199"/>
              <button onClick={() => void manualSearch()} disabled={isBusy}><Search size={17}/> Rechercher</button>
            </div>
          </div>

          <div className="privacy-note"><ShieldCheck size={18}/><span>La photo reste dans ce navigateur. Elle sert localement à comparer les illustrations et n’est jamais envoyée à TCGdex.</span></div>
        </div>
      </div>

      {candidates.length > 0 && (
        <section className="scan-results">
          <div className="result-head">
            <div><span className="eyebrow">Correspondances</span><h2>Confirme visuellement la bonne carte</h2></div>
            <span>{candidates.length} résultat{candidates.length > 1 ? 's' : ''}</span>
          </div>
          <div className="candidate-grid">
            {candidates.map((candidate, index) => {
              const collected = isCollected(candidate.id)
              const confirmed = confirmedId === candidate.id
              const strength = matchStrength(candidate.matchScore)
              const reliableBest = index === 0 && hasReliableBestMatch(candidates)
              return (
                <article className={`candidate-card ${confirmed ? 'confirmed' : ''}`} key={candidate.id}>
                  <div className="candidate-image">
                    <CardImage image={candidate.image} fallbackImage={candidate.fallbackImage} name={candidate.name} quality="low"/>
                    {reliableBest && <span className="best-match">Meilleure correspondance</span>}
                  </div>
                  <div className="candidate-content">
                    <div className={`candidate-confidence ${strength}`}>
                      <strong>Indice {candidate.matchScore}/100</strong>
                      <span>{candidate.matchReasons.join(' · ') || 'À vérifier'}</span>
                    </div>
                    <h3>{candidate.name}</h3>
                    <p>{candidate.setName ?? 'Extension non communiquée'} · n° {candidate.localId ?? 'inconnu'} · {candidate.language.toUpperCase()}</p>
                    <LivePrice live={candidate}/>
                    <div className="candidate-actions">
                      <button onClick={() => { onRemember(candidate); setConfirmedId(candidate.id) }}>
                        <CheckCircle2 size={17}/>{confirmed ? 'Carte confirmée' : 'C’est ma carte'}
                      </button>
                      <button className={collected ? 'collected' : 'primary-action'} onClick={() => { onRemember(candidate); onToggleCollection(candidate) }}>
                        <Library size={17}/>{collected ? 'Retirer de ma collection' : 'Ajouter à ma collection'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {recentCards.length > 0 && (
        <section className="recent-scans">
          <div className="result-head"><strong>Scans récents</strong><span>Conservés uniquement dans ce navigateur</span></div>
          <div className="recent-scan-list">
            {recentCards.slice(0, 6).map((card) => (
              <article key={card.id}>
                <CardImage image={card.image} fallbackImage={card.fallbackImage} name={card.name} quality="low"/>
                <div><strong>{card.name}</strong><span>{card.setName ?? 'Extension inconnue'} · n° {card.localId ?? '—'}</span></div>
                {isCollected(card.id) && <Library size={17}/>}
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
