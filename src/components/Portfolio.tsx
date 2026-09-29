import { useMemo, useRef, useState } from 'react'
import { Cloud, Download, Upload, AlertTriangle } from 'lucide-react'
import type { Card } from '../types'
import type { CollectionDocument } from '../domain/collection'
import { mergeCollections, parseCollection, upsertEntry } from '../domain/collection'
import { readRemotePortfolio, writeRemotePortfolio, type GitHubConnection } from '../services/githubSync'

type Props = { cards: Card[]; document: CollectionDocument; onChange: (document: CollectionDocument) => void; onToggle: (card: Card) => void }
export function Portfolio({ cards, document, onChange, onToggle }: Props) {
  const [filter, setFilter] = useState<'all'|'owned'|'missing'>('all')
  const [connection, setConnection] = useState<GitHubConnection>({ owner: '', repo: '', token: '' })
  const [sha, setSha] = useState<string>()
  const [account, setAccount] = useState('')
  const [sync, setSync] = useState<'local'|'pending'|'saved'|'conflict'|'error'>('local')
  const [message, setMessage] = useState('Stockée hors ligne sur cet appareil')
  const importRef = useRef<HTMLInputElement>(null)
  const owned = useMemo(() => new Set(document.entries.map(e => e.cardId)), [document])
  const shown = cards.filter(c => filter === 'all' || (filter === 'owned' ? owned.has(c.tcgdexId ?? c.id) : !owned.has(c.tcgdexId ?? c.id)))
  const connect = async () => {
    setSync('pending'); setMessage('Lecture distante…')
    try {
      const remote = await readRemotePortfolio(connection)
      setAccount(remote.login); setSha(remote.sha)
      if (remote.document) onChange(mergeCollections(document, remote.document))
      setSync('saved'); setMessage(`Chargée depuis GitHub · ${new Date().toLocaleString('fr-FR')}`)
    } catch (error) { setSync('error'); setMessage((error as Error).message) }
  }
  const save = async () => {
    setSync('pending'); setMessage('Sauvegarde en attente…')
    try {
      const result = await writeRemotePortfolio(connection, document, sha)
      setSha(result.content.sha); setSync('saved'); setMessage(`Sauvegardé · ${new Date().toLocaleString('fr-FR')}`)
    } catch (error) {
      setSync((error as { status?: number }).status === 409 ? 'conflict' : 'error'); setMessage((error as Error).message)
    }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }))
    const link = Object.assign(window.document.createElement('a'), { href: url, download: 'pokevalue-portfolio.json' }); link.click(); URL.revokeObjectURL(url)
  }
  return <section className="portfolio-page">
    <div className="portfolio-heading"><div><span className="eyebrow">Classeur numérique</span><h1>Mon portfolio</h1><p>{document.entries.reduce((sum,e)=>sum+e.quantity,0)} exemplaire(s) · {document.entries.length}/{cards.length} impressions · {Math.round(document.entries.length/cards.length*100)||0}%</p></div>
      <div className={`sync-state ${sync}`}><Cloud size={18}/><strong>{sync === 'saved' ? 'Synchronisé' : sync === 'conflict' ? 'Conflit' : sync === 'pending' ? 'En attente' : 'Local'}</strong><small>{message}</small></div></div>
    <div className="github-panel"><h2>Sauvegarde GitHub privée</h2><p>Le jeton reste uniquement en mémoire pour cette session. Utilisez un jeton fine-grained limité au dépôt privé, permission <b>Contents: Read and write</b>.</p>
      <div className="github-fields"><label>Propriétaire<input value={connection.owner} onChange={e=>setConnection({...connection,owner:e.target.value})}/></label><label>Dépôt privé<input value={connection.repo} onChange={e=>setConnection({...connection,repo:e.target.value})}/></label><label>Jeton<input type="password" autoComplete="off" value={connection.token} onChange={e=>setConnection({...connection,token:e.target.value})}/></label></div>
      <div className="sync-actions"><button onClick={connect} disabled={!connection.owner||!connection.repo||!connection.token}>Vérifier et charger</button><button onClick={save} disabled={!account||sync==='pending'}>Sauvegarder</button>{account&&<span>Compte authentifié : <b>@{account}</b></span>}</div>
      {sync==='conflict'&&<p className="conflict"><AlertTriangle size={16}/> Rechargez la version distante, vérifiez la fusion, puis sauvegardez.</p>}
    </div>
    <div className="portfolio-tools"><div>{(['all','owned','missing'] as const).map(f=><button className={filter===f?'active':''} onClick={()=>setFilter(f)} key={f}>{f==='all'?'Toutes':f==='owned'?'Possédées':'Manquantes'}</button>)}</div><button onClick={download}><Download size={16}/> Export JSON</button><button onClick={()=>importRef.current?.click()}><Upload size={16}/> Import JSON</button><input hidden ref={importRef} type="file" accept="application/json" onChange={async e=>{const file=e.target.files?.[0];if(file) { try { onChange(parseCollection(JSON.parse(await file.text()))); setMessage('Import JSON validé et chargé localement') } catch(error) { setSync('error'); setMessage((error as Error).message) } }}}/></div>
    <div className="binder-grid">{shown.map(card=>{const cardId=card.tcgdexId??card.id; const entry=document.entries.find(e=>e.cardId===cardId); const has=!!entry; return <article key={card.id} className={has?'owned':''}><div className="binder-placeholder" role="img" aria-label={`Image indisponible pour ${card.name}`}>{card.pokemon}<small>visuel chargé dans la fiche</small></div><strong>{card.name}</strong><span>{card.set} · {card.number}</span><small>{card.rarity} · {card.language} · variante {entry?.variant??'normale'}</small><button aria-pressed={has} onClick={()=>onToggle(card)}>{has?'✓ Je possède':'Je possède'}</button>{entry&&<div className="copy-editor"><label>Quantité<input aria-label={`Quantité de ${card.name}`} type="number" min="1" value={entry.quantity} onChange={e=>onChange(upsertEntry(document,{...entry,quantity:Number(e.target.value)}))}/></label><label>État<select value={entry.condition} onChange={e=>onChange(upsertEntry(document,{...entry,condition:e.target.value as typeof entry.condition}))}><option value="mint">Mint</option><option value="near-mint">Near Mint</option><option value="excellent">Excellent</option><option value="good">Bon</option><option value="played">Jouée</option><option value="poor">Abîmée</option></select></label><label>Notes<input value={entry.notes} onChange={e=>onChange(upsertEntry(document,{...entry,notes:e.target.value}))}/></label></div>}</article>})}</div>
  </section>
}
