import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, X } from 'lucide-react'
import { getSeries, getSet, listSeries, listSets, type SeriesSummary, type SetSummary } from '../api/sets'
import type { CollectionEntry, CardCondition } from '../domain/collection'
import { resolveCardImage } from '../domain/image'

type Props = { entries: CollectionEntry[] }
type Format = 'csv' | 'pdf'
type Scope = 'collection' | 'sets' | 'blocks' | 'missing'
type CatalogFilter = 'all' | 'owned' | 'missing'
type ImageSize = 'none' | 'small' | 'large'
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
function printPdf(win:Window,cards:ExportCard[],title:string,imageSize:ImageSize) {
  const groups=new Map<string,ExportCard[]>()
  cards.forEach(card=>{
    const key=JSON.stringify([card.setName,card.language])
    groups.set(key,[...(groups.get(key)??[]),card])
  })
  const sections=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b,'fr')).map(([key,items])=>{
    const [setName,language]=JSON.parse(key) as [string,string]
    items.sort((a,b)=>(a.number??'').localeCompare(b.number??'',undefined,{numeric:true})||a.name.localeCompare(b.name,'fr'))
    const copies=items.reduce((sum,card)=>sum+card.quantity,0)
    const list=items.map(card=>{
      const url=imageSize==='none'?'':cardImage(card)
      const image=url?'<div class="visual"><img src="'+escapeHtml(url)+'" alt="" /></div>':''
      const price=card.manualPrice!==undefined?'<span>Prix manuel : '+escapeHtml(card.manualPrice.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}))+'</span>':''
      const condition=card.condition?'<span>État : '+conditionName[card.condition]+'</span>':''
      const status=card.owned?'Possédée ×'+card.quantity:'Manquante'
      const rarity=card.rarity?'<span>'+escapeHtml(card.rarity)+'</span>':''
      return '<article class="card"><div class="details"><h3>'+escapeHtml(card.name)+'</h3><p>Nº '+escapeHtml(card.number||'—')+' · '+escapeHtml(status)+'</p><div class="facts">'+rarity+condition+price+'</div></div>'+image+'</article>'
    }).join('')
    return '<section class="set"><header><div><p class="eyebrow">'+escapeHtml(languageName[language]??language)+'</p><h2>'+escapeHtml(setName)+'</h2></div><b>'+items.length+' cartes · '+copies+' exemplaires</b></header><div class="cards">'+list+'</div></section>'
  }).join('')
  const totalCopies=cards.reduce((sum,card)=>sum+card.quantity,0)
  const generated=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})
  const hint=imageSize==='none'?'Inventaire compact, sans visuel. Les prix indiqués sont uniquement ceux saisis manuellement.':'Images '+(imageSize==='large'?'grand format':'petit format')+'. Les prix indiqués sont uniquement ceux saisis manuellement.'
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(title)+' · PokéValue</title><style>'+
  '@page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#172033;background:#fff;font-size:8pt}'+
  '.cover{padding:2mm 0 3mm;border-bottom:1.3px solid #ef514b;margin:0 0 4mm}.brand{color:#eb514c;font-size:7pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase}h1{font-size:19pt;line-height:1.05;margin:1.5mm 0}.subtitle{color:#637086;margin:0;font-size:8pt}.totals{display:flex;gap:7mm;margin-top:2mm;font-size:7pt}.totals b{display:block;font-size:11pt}.hint{margin:0 0 3mm;color:#687386;font-size:6.5pt}'+
  '.set{margin:0 0 4mm;break-inside:auto;page-break-inside:auto}.set>header{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid #cbd2dc;padding-bottom:1mm;margin-bottom:1.5mm;break-after:avoid;page-break-after:avoid}.set>header h2{font-size:11pt;margin:0}.set>header>b{font-size:7pt;color:#687386}.eyebrow{font-size:6pt;color:#e4504b;text-transform:uppercase;letter-spacing:.1em;margin:0 0 .5mm;font-weight:700}'+
  '.cards{display:grid;gap:1.5mm}.card{display:flex;align-items:center;justify-content:space-between;gap:1.5mm;border:1px solid #dce1e9;border-radius:1.5mm;padding:1.2mm;min-height:19mm;break-inside:avoid;page-break-inside:avoid}.details{min-width:0;flex:1;overflow:hidden}.details h3{font-size:7pt;line-height:1.1;margin:0 0 .8mm;overflow-wrap:anywhere}.details p{font-size:5.8pt;color:#687386;margin:0 0 .8mm;line-height:1.15}.facts{display:flex;flex-wrap:wrap;gap:.7mm 1.5mm;font-size:5.6pt;color:#5a6576;line-height:1.1}.visual{width:12mm;flex:0 0 12mm;aspect-ratio:63/88;background:#f1f3f7;border-radius:1mm;overflow:hidden;display:grid;place-items:center}.visual img{width:100%;height:100%;object-fit:contain}.cards-no-image .card{min-height:13mm}.cards-no-image .visual{display:none}footer{margin-top:3mm;border-top:1px solid #dce1e9;padding-top:1mm;color:#7a8493;font-size:6pt}'+
  '.cards-small{grid-template-columns:repeat(4,minmax(0,1fr))}.cards-large{grid-template-columns:repeat(3,minmax(0,1fr))}.cards-no-image{grid-template-columns:repeat(5,minmax(0,1fr))}.cards-large .card{min-height:32mm;padding:2mm;gap:2mm}.cards-large .visual{width:21mm;flex-basis:21mm}.cards-small .card{min-height:22mm}.cards-no-image .card{min-height:14mm}'+
  '@media screen{body{max-width:900px;margin:10px auto;padding:0 16px;font-size:14px}.cover{background:#f6f7fb;padding:16px;border-radius:14px;margin:0 0 10px}h1{font-size:26px;margin:4px 0}.subtitle{font-size:13px}.totals{gap:18px;margin-top:10px;font-size:12px}.totals b{font-size:17px}.hint{font-size:11px;margin:0 0 8px}.set{margin-bottom:14px}.set>header{padding-bottom:5px;margin-bottom:6px}.set>header h2{font-size:17px}.set>header>b{font-size:11px}.cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.card{gap:5px;padding:5px;min-height:54px}.details h3{font-size:12px}.details p{font-size:10px}.facts{font-size:9px}.visual{width:42px;flex-basis:42px}.cards-large .visual{width:54px;flex-basis:54px}.cards-no-image .card{min-height:44px}}'+
  '@media screen and (max-width:600px){body{padding:0 10px;margin:6px auto}.cover{padding:12px}.totals{gap:10px}.hint{font-size:10px}.cards{grid-template-columns:1fr 1fr}.card{padding:4px;gap:4px}.visual{width:36px;flex-basis:36px}.cards-large .visual{width:46px;flex-basis:46px}.cards-no-image .card{min-height:38px}}'+
  '@media print{.hint{display:none!important}body{margin:0;padding:0}.cards-small{grid-template-columns:repeat(4,minmax(0,1fr))}.cards-large{grid-template-columns:repeat(3,minmax(0,1fr))}.cards-no-image{grid-template-columns:repeat(5,minmax(0,1fr))}}'+
  '</style></head><body class="image-mode-'+imageSize+'"><div class="cover"><div class="brand">PokéValue · Classeur personnel</div><h1>'+escapeHtml(title)+'</h1><p class="subtitle">Classé par extension et langue · '+generated+'</p><div class="totals"><div><b>'+cards.length+'</b> cartes</div><div><b>'+totalCopies+'</b> exemplaires possédés</div><div><b>'+groups.size+'</b> groupes extension / langue</div></div></div><p class="hint">'+hint+'</p>'+sections+'<footer>Document personnel créé avec PokéValue. Seuls les prix saisis manuellement sont affichés.</footer><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),400));</script></body></html>'
  win.document.open()
  win.document.write(html)
  win.document.close()
}
const ownedRecord=(entry:CollectionEntry):ExportCard=>({...entry,owned:true})
function catalogRecords(setId:string,setName:string,language:string,cards:{id:string;name:string;localId:string;image?:string;rarity?:string}[],entries:CollectionEntry[],filter:CatalogFilter):ExportCard[] {
  return cards.flatMap(card=>{
    const matches=entries.filter(entry=>entry.quantity>0&&entry.cardId===card.id&&entry.language===language)
    if(filter==='owned'&&!matches.length)return []
    if(filter==='missing'&&matches.length)return []
    if(matches.length)return matches.map(entry=>({...entry,setName,setId,number:card.localId,name:card.name,image:card.image??entry.image,rarity:card.rarity??entry.rarity,owned:true}))
    return [{setId,setName,cardId:card.id,language,name:card.name,number:card.localId,image:card.image,rarity:card.rarity,variant:'normal',quantity:0,owned:false}]
  })
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
    setLoading(true);setError('')
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
    }
    setBusy(true);setError('')
    try{
      let cards:ExportCard[]
      let title='Ma collection Pokémon'
      if(scope==='collection'){
        cards=owned.map(ownedRecord)
      }else{
        const targetSets=scope==='blocks'?selectedSets:scope==='missing'?sets.filter(set=>selectedIds.includes(set.id)).slice(0,1):selectedSets
        if(!targetSets.length)throw new Error('Sélectionne une extension ou un bloc à exporter.')
        if(scope==='blocks'&&targetSets.length>60)throw new Error('Sélection trop large : choisis au maximum 60 extensions par export pour garder un PDF maniable.')
        const details=await Promise.all(targetSets.map(set=>getSet(set.id,language)))
        cards=details.flatMap(detail=>catalogRecords(detail.id,detail.name,language,detail.cards,entries,scope==='missing'?'missing':filter))
        title=scope==='missing'?'Cartes manquantes · '+(details[0]?.name??'Extension'):scope==='blocks'?'Collection · '+selectedIds.map(id=>series.find(item=>item.id===id)?.name??id).join(', '):'Collection · '+targetSets.map(item=>item.name).join(', ')
      }
      if(!cards.length)throw new Error('Aucune carte ne correspond à cette sélection.')
      if(format==='csv')downloadCsv(cards,title)
      else if(printWindow)printPdf(printWindow,cards,title,imageSize)
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
        <label className="export-field"><span>Contenu</span><select value={scope} onChange={event=>changeScope(event.target.value as Scope)}><option value="collection">Toute ma collection possédée</option><option value="sets">Une ou plusieurs extensions</option><option value="blocks">Un ou plusieurs blocs</option><option value="missing">Cartes manquantes d’une extension</option></select></label>
        {scope!=='collection'&&<>
          <label className="export-field"><span>Langue du catalogue</span><select value={language} onChange={event=>{setLanguage(event.target.value);setSelectedIds([])}}>{languages.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
          {scope!=='missing'&&<label className="export-field"><span>Cartes à inclure</span><select value={filter} onChange={event=>setFilter(event.target.value as CatalogFilter)}><option value="all">Toutes les cartes de la sélection</option><option value="owned">Seulement les cartes possédées</option><option value="missing">Seulement les cartes manquantes</option></select></label>}
          <div className="export-picker-heading"><strong>{scope==='blocks'?'Choisir les blocs':'Choisir les extensions'}</strong><small>{selectedIds.length} sélectionné{selectedIds.length===1?'':'s'}</small></div>
          <input className="export-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={scope==='blocks'?'Rechercher un bloc':'Rechercher une extension'} aria-label="Rechercher dans les séries"/>
          {loading&&<p className="export-status">Chargement du catalogue…</p>}
          {!loading&&visibleItems.length>0&&<div className="export-options">
            {visibleItems.map(item=><label key={item.id}><input type={scope==='missing'?'radio':'checkbox'} name="export-item" checked={selectedIds.includes(item.id)} onChange={event=>toggleSelected(item.id,event.target.checked,scope==='missing')}/><span>{item.name}</span>{'cardCount'in item&&<small>{item.cardCount.total} cartes</small>}</label>)}
          </div>}
          {!loading&&visibleItems.length===0&&!error&&<p className="export-status">Aucun élément trouvé.</p>}
          {scope==='blocks'&&selectedIds.length>0&&<p className="export-status">Extensions incluses : {selectedSets.length||'chargement…'}</p>}
        </>}
        {format==='pdf'&&<fieldset className="export-images"><legend>Images du PDF</legend><label><input type="radio" name="export-image-size" checked={imageSize==='none'} onChange={()=>setImageSize('none')}/><span>Sans image · 5 cartes par rangée</span></label><label><input type="radio" name="export-image-size" checked={imageSize==='small'} onChange={()=>setImageSize('small')}/><span>Petites images · 4 cartes par rangée</span></label><label><input type="radio" name="export-image-size" checked={imageSize==='large'} onChange={()=>setImageSize('large')}/><span>Grandes images · 3 cartes par rangée</span></label></fieldset>}
        {scope==='collection'&&<p className="export-status">Toutes les langues et extensions possédées seront incluses. Pour exporter aussi les cartes manquantes, choisis une extension ou un bloc.</p>}
        {error&&<p className="export-error" role="alert">{error}</p>}
        <footer><button type="button" className="export-cancel" onClick={()=>setOpen(false)} disabled={busy}>Annuler</button><button type="button" className="export-submit" onClick={runExport} disabled={!canExport||busy}>{busy?'Préparation…':format==='csv'?'Télécharger le CSV':'Créer le PDF'} <FileText size={16}/></button></footer>
      </section>
    </div>}
  </>
}
