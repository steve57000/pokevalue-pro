import { useRef } from 'react'
import { AlertTriangle, Cloud, Download, Upload } from 'lucide-react'
import { parseCollection, type CollectionDocument } from '../domain/collection'
import type { GitHubCollectionSync } from '../hooks/useGitHubCollectionSync'

export function CollectionSyncSettings({ sync, document, onChange }: { sync: GitHubCollectionSync; document: CollectionDocument; onChange: (value: CollectionDocument) => void }) {
  const importRef = useRef<HTMLInputElement>(null)
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }))
    const link = Object.assign(window.document.createElement('a'), { href: url, download: 'pokevalue-portfolio.json' }); link.click(); URL.revokeObjectURL(url)
  }
  return <section className="sync-page tool-page">
    <span className="eyebrow"><Cloud size={16}/> Synchronisation</span><h1>Sauvegarde</h1><p>Ta collection locale reste disponible hors connexion. Relie un dépôt privé pour la sauvegarder automatiquement.</p>
    <div className={`sync-state ${sync.status}`}><Cloud size={18}/><strong>{sync.status === 'saved' ? 'Synchronisé' : sync.status === 'pending' ? 'En cours' : sync.status === 'conflict' ? 'Conflit' : sync.status === 'error' ? 'Erreur' : 'Local'}</strong><small>{sync.message}</small></div>
    <div className="github-panel"><h2>Sauvegarde GitHub privée</h2><p>Le jeton doit être limité au dépôt privé avec la permission <b>Contents: Read and write</b>.</p>
      <div className="github-fields"><label>Propriétaire<input value={sync.connection.owner} onChange={e=>sync.setConnection({...sync.connection,owner:e.target.value})}/></label><label>Dépôt privé<input value={sync.connection.repo} onChange={e=>sync.setConnection({...sync.connection,repo:e.target.value})}/></label><label>Jeton<input type="password" autoComplete="off" value={sync.connection.token} onChange={e=>sync.setConnection({...sync.connection,token:e.target.value})}/></label></div>
      <div className="sync-actions"><label><input type="checkbox" checked={sync.remember} onChange={e=>sync.setRemember(e.target.checked)}/> Rester connecté sur cet appareil</label><button onClick={()=>void sync.connect()} disabled={!sync.connection.owner||!sync.connection.repo||!sync.connection.token}>Vérifier et charger</button>{sync.account&&<><span>Compte : <b>@{sync.account}</b></span><button onClick={sync.disconnect}>Déconnexion</button></>}</div>
      {sync.status==='conflict'&&<p className="conflict"><AlertTriangle size={16}/> Une autre session a modifié la sauvegarde. <button onClick={()=>void sync.resolveConflict()}>Fusionner et réessayer</button></p>}
      {sync.status==='error'&&<button onClick={()=>void (sync.account ? sync.retry() : sync.connect())}>Réessayer</button>}
      <p className="last-sync">Dernière sauvegarde : {sync.lastSavedAt ? sync.lastSavedAt.toLocaleString('fr-FR') : 'aucune sauvegarde distante durant cette session'}</p>
    </div>
    <div className="portfolio-tools"><button onClick={download}><Download size={16}/> Export JSON</button><button onClick={()=>importRef.current?.click()}><Upload size={16}/> Import JSON</button><input hidden ref={importRef} type="file" accept="application/json" onChange={async e=>{const file=e.target.files?.[0];if(file) try { onChange(parseCollection(JSON.parse(await file.text()))); sync.markImport('Import chargé localement') } catch(error) { sync.markImport((error as Error).message) }}}/></div>
  </section>
}
