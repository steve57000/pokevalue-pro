import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, X } from 'lucide-react'
import { getSeries, getSet, listSeries, listSets, type SeriesSummary, type SetSummary } from '../api/sets'
import type { CollectionEntry, CardCondition } from '../domain/collection'
import { resolveCardImage } from '../domain/image'
import { buildCollectionPdf } from '../domain/exportPdf'

type Props = { entries: CollectionEntry[] }
type Format = 'csv' | 'pdf'
type Scope = 'collection' | 'sets' | 'blocks' | 'missing'
type CatalogFilter = 'all' | 'owned' | 'missing'
type ImageSize = 'none' | 'small' | 'medium' | 'large'
type ExportCard = {
  setId: string
  setName: string
  cardId: string
  language: string
  name: string
  number?: string
  image?: string
  rarity?: string
  variant: string
  quantity: number
  condition?: CardCondition
  notes?: string
  manualPrice?: number
  priceMode?: 'market' | 'manual'
  owned: boolean
}
const languages = [['fr','Français'],['en','Anglais'],['ja','Japonais'],['zh-tw','Chinois traditionnel']] as const
const languageName: Record<string,string> = Object.fromEntries(languages)
const conditionName: Record<CardCondition,string> = { mint:'Mint','near-mint':'Near Mint',excellent:'Excellent',good:'Bon',played:'Joué',poor:'Abîmé' }
const safeImage = (value?:string) => value && (/^https:\/\//i.test(value) || value.startsWith('/')) ? value : ''
const cardImage = (entry:Pick<ExportCard,'cardId'|'name'|'number'|'image'|'language'>) => safeImage(resolveCardImage({card:{id:entry.cardId,name:entry.name,localId:entry.number,image:entry.image,language:entry.language},requestedLanguage:entry.language,quality:'low'}).url)
const csvCell = (value:unknown) => {
  let text = String(value ?? '')
  if (/^[=+@-]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g,'""') + '"'
}
const fileSlug = (value:string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'collection'
const today = () => new Date().toISOString().slice(0,10)

function downloadCsv(cards:ExportCard[], title:string) {
  const header = ['Statut','Extension','Langue','N° de carte','Pokémon','Rareté','Variante','Quantité','État','Prix manuel (€)','Mode de prix','Notes','URL image','ID carte']
  const rows = cards.map(card => [card.owned?'Possédée':'Manquante',card.setName,languageName[card.language]??card.language,card.number??'',card.name,card.rarity??'',card.variant,card.quantity,card.condition?conditionName[card.condition]:'',card.manualPrice??'',card.priceMode??(card.manualPrice!==undefined?'manual':'market'),card.notes??'',cardImage(card),card.cardId])
  const csv = '\uFEFF' + [header,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
  const anchor=document.createElement('a')
  anchor.href=url
  anchor.download='pokevalue-'+fileSlug(title)+'-'+today()+'.csv'
  anchor.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

const escapeHtml = (value:unknown) => String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] as string))
async function printPdf(win:Window,cards:ExportCard[],title:string,imageSize:ImageSize,returnUrl:string) {
  const pdf=await buildCollectionPdf(cards.map(card=>({...card,image:cardImage(card)})),title,imageSize)
  if(win.closed)throw new Error('La fenêtre du PDF a été fermée avant la fin de la génération.')
  const pdfUrl=URL.createObjectURL(pdf)
  const filename='pokevalue-'+fileSlug(title)+'-'+today()+'.pdf'
  const pageCount=pdf.size>0?'Le document est prêt, au format A4.':'Le PDF est vide.'
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(title)+' · PokéValue</title><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font:16px system-ui,-apple-system,sans-serif;color:#172033;background:#eef1f6}.toolbar{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px;background:#172033}.toolbar a{flex:1 1 140px;min-height:46px;display:flex;justify-content:center;align-items:center;padding:10px 14px;border:1px solid #526078;border-radius:12px;background:#29364c;color:#fff;text-decoration:none;font-weight:650;text-align:center}.toolbar a.primary{background:#ef514b;border-color:#ef514b}.status{margin:0;padding:9px 14px;background:#fff;color:#566276;font-size:13px}iframe{display:block;width:100%;height:calc(100dvh - 126px);min-height:420px;border:0;background:white}@media(max-width:600px){.toolbar{display:grid;grid-template-columns:1fr 1fr;padding:9px;gap:8px}.toolbar a{font-size:14px;padding:8px}.status{font-size:12px}iframe{height:calc(100dvh - 142px);min-height:320px}}@media print{.toolbar,.status{display:none}iframe{height:100dvh}}</style></head><body><nav class="toolbar"><a href="'+escapeHtml(returnUrl)+'">← Retour à PokéValue</a><a class="primary" href="'+escapeHtml(pdfUrl)+'" target="_blank" rel="noopener">Ouvrir / partager le PDF</a><a href="'+escapeHtml(pdfUrl)+'" download="'+escapeHtml(filename)+'">Télécharger le PDF</a></nav><p class="status">'+pageCount+' · Les pages et les cartes sont déjà mises en page dans le fichier.</p><iframe title="Aperçu du PDF" src="'+escapeHtml(pdfUrl)+'"></iframe></body></html>'
  win.document.open()
  win.document.write(html)
  win.document.close()
}
const ownedRecord=(entry:CollectionEntry):ExportCard=>({...entry,owned:true})
function catalogRecords(setId:string,setName:string,language:string,cards:{id:string;name:string;localId:string;image?:string;rarity?:string}[],entries:CollectionEntry[],filter:CatalogFilter):ExportCard[] {
  const result:ExportCard[]=[]
  for(const card of cards){
    const matches=entries.filter(entry=>entry.quantity>0&&entry.cardId===card.id&&entry.language===language)
    if(filter==='owned'&&!matches.length)continue
    if(filter==='missing'&&matches.length)continue
    if(matches.length){
      result.push(...matches.map(entry=>({...entry,setName,setId,number:card.localId,name:card.name,image:card.image??entry.image,rarity:card.rarity??entry.rarity,owned:true})))
    }else{
      result.push({setId,setName,cardId:card.id,language,name:card.name,number:card.localId,image:card.image,rarity:card.rarity,variant:'normal',quantity:0,owned:false})
    }
  }
  return result
}

export function CollectionExport({entries}:Props) {
  const [open,setOpen]=useState(false)
  const [format,setFormat]=useState<Format>('csv')
  const [scope,setScope]=useState<Scope>('collection')
  const [language,setLanguage]=useState<string>('fr')
  const [filter,setFilter]=useState<CatalogFilter>('all')
  const [imageSize,setImageSize]=useState<ImageSize>('small')
  const [series,setSeries]=useState<SeriesSummary[]>([])
  const [sets,setSets]=useState<SetSummary[]>([])
  const [setsByBlock,setSetsByBlock]=useState<Record<string,SetSummary[]>>({})
  const [selectedIds,setSelectedIds]=useState<string[]>([])
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const owned=useMemo(()=>entries.filter(entry=>entry.quantity>0),[entries])
  useEffect(()=>{
    if(!open||scope==='collection')return
    let active=true
    setLoading(true);setError('')
    Promise.all([listSets(language),listSeries(language)]).then(([availableSets,availableSeries])=>{
      if(!active)return
      setSets(availableSets);setSeries(availableSeries);setSelectedIds([])
    }).catch(()=>active&&setError('Impossible de charger les séries. Vérifie ta connexion et réessaie.')).finally(()=>active&&setLoading(false))
    return()=>{active=false}
  },[open,scope,language])

  useEffect(()=>{
    if(!open||scope!=='blocks'||selectedIds.length===0){setSetsByBlock({});return}
    let active=true
    setSetsByBlock({});setLoading(true);setError('')
    Promise.all(selectedIds.map(id=>getSeries(id,language))).then(details=>{
      if(!active)return
      setSetsByBlock(Object.fromEntries(details.map(detail=>[detail.id,detail.sets])))
    }).catch(()=>active&&setError('Impossible de charger les extensions de ce bloc.')).finally(()=>active&&setLoading(false))
    return()=>{active=false}
  },[open,scope,language,selectedIds])

  const chooserItems=scope==='blocks'?series:sets
  const visibleItems=chooserItems.filter(item=>item.name.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')))
  const selectedSets=scope==='blocks'
    ? selectedIds.flatMap(id=>setsByBlock[id]??[])
    : sets.filter(set=>selectedIds.includes(set.id))
  const canExport=scope==='collection'?owned.length>0:selectedIds.length>0&&!loading

  const changeScope=(next:Scope)=>{
    setScope(next);setSelectedIds([]);setQuery('');setError('')
    if(next==='missing')setFilter('missing')
    else setFilter('all')
  }
  const toggleSelected=(id:string,checked:boolean,single=false)=>{
    setSelectedIds(current=>single?(checked?[id]:[]):checked?[...new Set([...current,id])]:current.filter(value=>value!==id))
  }

  const runExport=async()=>{
    if(!canExport)return
    let printWindow:Window|null=null
    if(format==='pdf'){
      printWindow=window.open('','_blank')
      if(!printWindow){setError('Autorise les fenêtres surgissantes pour créer le PDF.');return}
      printWindow.document.write('<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Préparation du PDF · PokéValue</title><body style="font:16px system-ui;padding:24px;color:#172033">Préparation du PDF… Les cartes et leurs images sont intégrées au document.</body></html>')
    }
    setBusy(true);setError('')
    try{
      let cards:ExportCard[]
      let title='Ma collection Pokémon'
      if(scope==='collection'){
        cards=owned.map(ownedRecord)
      }else{
        const targetSets=scope==='blocks'?selectedSets:scope==='missing'?sets.filter(set=>selectedIds.includes(set.id)):selectedSets
        if(!targetSets.length)throw new Error('Sélectionne une extension ou un bloc à exporter.')
        if((scope==='blocks'||scope==='missing')&&targetSets.length>60)throw new Error('Sélection trop large : choisis au maximum 60 extensions par export pour garder un PDF maniable.')
        const details=await Promise.all(targetSets.map(set=>getSet(set.id,language)))
        cards=details.flatMap(detail=>catalogRecords(detail.id,detail.name,language,detail.cards,entries,scope==='missing'?'missing':filter))
        title=scope==='missing'?'Cartes manquantes · '+details.map(detail=>detail.name).join(', '):scope==='blocks'?'Collection · '+selectedIds.map(id=>series.find(item=>item.id===id)?.name??id).join(', '):'Collection · '+targetSets.map(item=>item.name).join(', ')
      }
      if(!cards.length)throw new Error('Aucune carte ne correspond à cette sélection.')
      if(format==='csv')downloadCsv(cards,title)
      else if(printWindow)await printPdf(printWindow,cards,title,imageSize,window.location.href)
      setOpen(false)
    }catch(reason){
      if(printWindow)printWindow.close()
      setError(reason instanceof Error?reason.message:'L’export a échoué. Réessaie.')
    }finally{setBusy(false)}
  }

  return <>
    <div className="collection-export">
      <div><strong>Exporter mes données</strong><span>{owned.length} cartes · {owned.reduce((sum,entry)=>sum+entry.quantity,0)} exemplaires</span></div>
      <button type="button" onClick={()=>{setOpen(true);setError('')}} aria-label="Préparer un export CSV ou PDF"><Download size={17}/> Exporter</button>
    </div>
    {open&&<div className="export-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setOpen(false)}}>
      <section className="export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <header><div><span className="eyebrow">Classeur personnel</span><h2 id="export-title">Préparer un export</h2></div><button type="button" className="export-close" aria-label="Fermer" onClick={()=>setOpen(false)} disabled={busy}><X size={20}/></button></header>
        <label className="export-field"><span>Format</span><select value={format} onChange={event=>setFormat(event.target.value as Format)}><option value="csv">CSV · tableur</option><option value="pdf">PDF · impression / partage</option></select></label>
        <label className="export-field"><span>Contenu</span><select value={scope} onChange={event=>changeScope(event.target.value as Scope)}><option value="collection">Toute ma collection possédée</option><option value="sets">Une ou plusieurs extensions</option><option value="blocks">Un ou plusieurs blocs</option><option value="missing">Cartes manquantes d’une ou plusieurs extensions</option></select></label>
        {scope!=='collection'&&<>
          <label className="export-field"><span>Langue du catalogue</span><select value={language} onChange={event=>{setLanguage(event.target.value);setSelectedIds([])}}>{languages.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
          {scope!=='missing'&&<label className="export-field"><span>Cartes à inclure</span><select value={filter} onChange={event=>setFilter(event.target.value as CatalogFilter)}><option value="all">Toutes les cartes de la sélection</option><option value="owned">Seulement les cartes possédées</option><option value="missing">Seulement les cartes manquantes</option></select></label>}
          <div className="export-picker-heading"><strong>{scope==='blocks'?'Choisir les blocs':'Choisir les extensions'}</strong><small>{selectedIds.length} sélectionné{selectedIds.length===1?'':'s'}</small></div>
          <input className="export-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={scope==='blocks'?'Rechercher un bloc':'Rechercher une extension'} aria-label="Rechercher dans les séries"/>
          {loading&&<p className="export-status">Chargement du catalogue…</p>}
          {!loading&&visibleItems.length>0&&<div className="export-options">
            {visibleItems.map(item=><label key={item.id}><input type="checkbox" name="export-item" checked={selectedIds.includes(item.id)} onChange={event=>toggleSelected(item.id,event.target.checked)}/><span>{item.name}</span>{'cardCount'in item&&<small>{(item as SetSummary).cardCount.total} cartes</small>}</label>)}
          </div>}
          {!loading&&visibleItems.length===0&&!error&&<p className="export-status">Aucun élément trouvé.</p>}
          {scope==='blocks'&&selectedIds.length>0&&<p className="export-status">Extensions incluses : {selectedSets.length||'chargement…'}</p>}
        </>}
        {format==='pdf'&&<fieldset className="export-images"><legend>Images du PDF</legend><label><input type="radio" name="export-image-size" checked={imageSize==='none'} onChange={()=>setImageSize('none')}/><span>Sans image · 5 cartes par rangée</span></label><label><input type="radio" name="export-image-size" checked={imageSize==='large'} onChange={()=>setImageSize('large')}/><span>Grandes images · 3 cartes par rangée</span></label><label><input type="radio" name="export-image-size" checked={imageSize==='medium'} onChange={()=>setImageSize('medium')}/><span>Images moyennes · 4 cartes par rangée</span></label><label><input type="radio" name="export-image-size" checked={imageSize==='small'} onChange={()=>setImageSize('small')}/><span>Petites images · 5 cartes par rangée</span></label></fieldset>}
        {scope==='collection'&&<p className="export-status">Toutes les langues et extensions possédées seront incluses. Pour exporter aussi les cartes manquantes, choisis une extension ou un bloc.</p>}
        {error&&<p className="export-error" role="alert">{error}</p>}
        <footer><button type="button" className="export-cancel" onClick={()=>setOpen(false)} disabled={busy}>Annuler</button><button type="button" className="export-submit" onClick={runExport} disabled={!canExport||busy}>{busy?'Préparation…':format==='csv'?'Télécharger le CSV':'Créer le PDF'} <FileText size={16}/></button></footer>
      </section>
    </div>}
  </>
}
