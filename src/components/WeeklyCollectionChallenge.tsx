import { useEffect, useState } from 'react'
import { CheckCircle2, Share2, Sparkles, Trophy } from 'lucide-react'
import { countUniqueOwnedCards, decodeSharedChallenge, encodeSharedChallenge, getWeekStart, parseWeeklyChallenge, startWeeklyChallenge, advanceWeeklyChallenge, weeklyChallengeProgress, WEEKLY_CHALLENGE_STORAGE_KEY } from '../domain/weeklyChallenge'
import type { CollectionEntry } from '../domain/collection'
import { readStoredJson, writeStoredJson } from '../utils/storage'

export function WeeklyCollectionChallenge({ entries }: { entries: CollectionEntry[] }) {
  const uniqueCount = countUniqueOwnedCards(entries)
  const weekStart = getWeekStart()
  const [challenge, setChallenge] = useState(() => parseWeeklyChallenge(readStoredJson<unknown>(WEEKLY_CHALLENGE_STORAGE_KEY, null)))
  const [message, setMessage] = useState('')
  const currentChallenge = challenge?.weekStart === weekStart ? challenge : undefined
  const progress = currentChallenge ? weeklyChallengeProgress(currentChallenge) : 0

  useEffect(() => { if (challenge) writeStoredJson(WEEKLY_CHALLENGE_STORAGE_KEY, challenge) }, [challenge])
  useEffect(() => {
    if (!currentChallenge) return
    setChallenge((saved) => saved ? advanceWeeklyChallenge(saved, uniqueCount) : saved)
  }, [uniqueCount, currentChallenge?.weekStart, currentChallenge?.bestUnique])

  const shareChallenge = async () => {
    if (!currentChallenge) return
    const snapshot = {
      version: 1 as const,
      weekStart,
      added: progress,
      goal: currentChallenge.goal,
      total: uniqueCount,
      sharedAt: new Date().toISOString(),
    }
    const url = new URL(window.location.href)
    url.hash = `share=${encodeSharedChallenge(snapshot)}`
    const shareText = `Mon défi PokéValue : ${progress}/${currentChallenge.goal} cartes ajoutées cette semaine, sur ${uniqueCount} cartes différentes dans mon classeur.`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mon défi PokéValue', text: shareText, url: url.href })
        setMessage('Ton défi est prêt à être partagé.')
      } else {
        await navigator.clipboard.writeText(url.href)
        setMessage('Lien de progression copié. Tu peux le coller où tu veux.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage('Le partage a échoué. Réessaie depuis le bouton de partage.')
    }
  }

  return <section className="weekly-challenge" aria-labelledby="weekly-challenge-title">
    <div className="challenge-emblem"><Trophy size={21}/></div>
    <div className="challenge-content">
      <div className="feature-section-heading"><div><span className="eyebrow"><Sparkles size={14}/> Quête hebdomadaire</span><h2 id="weekly-challenge-title">Défi du classeur</h2></div><span className="challenge-week">Semaine du {formatDate(weekStart)}</span></div>
      {currentChallenge ? <>
        <p className="challenge-description">Ajoute <strong>{currentChallenge.goal} cartes différentes</strong> à ta collection cette semaine.</p>
        <div className="challenge-progress-line"><div className="challenge-progress-track" role="progressbar" aria-label="Progression du défi hebdomadaire" aria-valuemin={0} aria-valuemax={currentChallenge.goal} aria-valuenow={progress}><i style={{ width: `${Math.min(100, progress / currentChallenge.goal * 100)}%` }}/></div><strong>{progress}/{currentChallenge.goal}</strong></div>
        <div className="challenge-footer"><span className={progress >= currentChallenge.goal ? 'challenge-badge complete' : 'challenge-badge'}>{progress >= currentChallenge.goal ? <CheckCircle2 size={15}/> : <Trophy size={15}/>} {progress >= currentChallenge.goal ? 'Défi réussi !' : progress >= 3 ? 'Badge Repéreur' : 'Badge en préparation'}</span><button type="button" className="feature-secondary" onClick={shareChallenge}><Share2 size={16}/> Partager ma progression</button></div>
      </> : <div className="challenge-start-row"><div><p className="challenge-description">Cette semaine, complète le défi <strong>+5 cartes différentes</strong> et partage ta progression.</p><small>La progression est calculée à partir du nombre de cartes uniques dans ton classeur au lancement.</small></div><button type="button" className="feature-primary" onClick={() => { setChallenge(startWeeklyChallenge(uniqueCount)); setMessage('Défi lancé : ajoute 5 cartes différentes cette semaine !') }}><Trophy size={16}/> Lancer le défi</button></div>}
      {message && <p className="feature-feedback" role="status" aria-live="polite">{message}</p>}
      <small className="challenge-privacy">Le lien partagé contient seulement un instantané agrégé de ta progression, sans liste de cartes ni prix.</small>
    </div>
  </section>
}

export function SharedChallengePage({ token }: { token: string }) {
  const snapshot = decodeSharedChallenge(token)
  if (!snapshot) return <section className="shared-challenge-card"><div className="brand-mark">PV</div><span className="eyebrow">Défi PokéValue</span><h1>Ce lien de progression n’est pas valide.</h1><p>Demande à ton ami de partager son défi à nouveau.</p><a className="feature-primary" href={`${window.location.pathname}${window.location.search}#/collection`}>Découvrir PokéValue</a></section>

  const percentage = Math.min(100, Math.round(snapshot.added / snapshot.goal * 100))
  return <section className="shared-challenge-card">
    <div className="brand-mark">PV</div><span className="eyebrow"><Sparkles size={14}/> Défi PokéValue partagé</span><h1>La collection avance !</h1>
    <p>Instantané du défi de la semaine du {formatDate(snapshot.weekStart)}.</p>
    <div className="shared-challenge-score"><Trophy size={28}/><strong>{Math.min(snapshot.added, snapshot.goal)}<span>/{snapshot.goal}</span></strong><small>cartes ajoutées au défi</small></div>
    <div className="shared-challenge-track" role="progressbar" aria-label="Progression partagée" aria-valuemin={0} aria-valuemax={snapshot.goal} aria-valuenow={Math.min(snapshot.added, snapshot.goal)}><i style={{ width: `${percentage}%` }}/></div>
    <div className="shared-challenge-stats"><span>Progression<strong>{percentage} %</strong></span><span>Classeur<strong>{snapshot.total} cartes différentes</strong></span></div>
    <small className="challenge-privacy">Lien créé le {new Date(snapshot.sharedAt).toLocaleDateString('fr-FR')}. Il montre uniquement cette progression agrégée.</small>
    <a className="feature-primary" href={`${window.location.pathname}${window.location.search}#/collection`}>Créer mon défi <Sparkles size={16}/></a>
  </section>
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}
