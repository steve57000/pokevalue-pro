import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, X } from 'lucide-react'
import { getSeries, getSet, listSeries, listSets, type SeriesSummary, type SetSummary } from '../api/sets'
import type { CollectionEntry, CardCondition } from '../domain/collection'
import { resolveCardImage } from '../domain/image'

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
function printPdf(win:Window,cards:ExportCard[],title:string,imageSize:ImageSize,returnUrl:string) {
  const groups=new Map<string,ExportCard[]>()
  cards.forEach(card=>{
    const key=JSON.stringify([card.setName,card.language])
    groups.set(key,[...(groups.get(key)??[]),card])
  })
  const config={
    large:{columns:3,rows:4,height:56,gap:2},
    medium:{columns:4,rows:5,height:46,gap:2},
    small:{columns:5,rows:6,height:38,gap:1.5},
    none:{columns:5,rows:9,height:25,gap:1.5},
  }[imageSize]
  const pageLimit=config.columns*config.rows
  const pages:string[]=[]
  for(const [key,items] of [...groups.entries()].sort(([a],[b])=>a.localeCompare(b,'fr'))){
    const [setName,language]=JSON.parse(key) as [string,string]
    items.sort((a,b)=>(a.number??'').localeCompare(b.number??'',undefined,{numeric:true})||a.name.localeCompare(b.name,'fr'))
    const copies=items.reduce((sum,card)=>sum+card.quantity,0)
    const pageCount=Math.ceil(items.length/pageLimit)
    for(let offset=0;offset<items.length;offset+=pageLimit){
      const pageItems=items.slice(offset,offset+pageLimit)
      const list=pageItems.map(card=>{
        const url=imageSize==='none'?'':cardImage(card)
        const image=url?'<div class="visual"><img src="'+escapeHtml(url)+'" alt="" /></div>':''
        const price=card.manualPrice!==undefined?'<span>Prix manuel : '+escapeHtml(card.manualPrice.toLocaleString('fr-FR',{style:'currency',currency:'EUR'}))+'</span>':''
        const condition=card.condition?'<span>État : '+conditionName[card.condition]+'</span>':''
        const status=card.owned?'Possédée ×'+card.quantity:'Manquante'
        const rarity=card.rarity?'<span>'+escapeHtml(card.rarity)+'</span>':''
        return '<article class="card">'+image+'<div class="details"><h3>'+escapeHtml(card.name)+'</h3><p>Nº '+escapeHtml(card.number||'—')+' · '+escapeHtml(status)+'</p><div class="facts">'+rarity+condition+price+'</div></div></article>'
      }).join('')
      const pageNumber=Math.floor(offset/pageLimit)+1
      pages.push('<section class="print-page cards-page"><header class="set-heading"><div><p class="eyebrow">'+escapeHtml(languageName[language]??language)+'</p><h2>'+escapeHtml(setName)+'</h2></div><b>'+items.length+' cartes · '+copies+' exemplaires · page '+pageNumber+'/'+pageCount+'</b></header><div class="cards cards-'+imageSize+'" style="--columns:'+config.columns+';--card-height:'+config.height+'mm;--card-gap:'+config.gap+'mm">'+list+'</div></section>')
    }
  }
  const totalCopies=cards.reduce((sum,card)=>sum+card.quantity,0)
  const ownedCount=cards.filter(card=>card.owned).length
  const missingCount=cards.length-ownedCount
  const generated=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})
  const setNames=[...new Set(cards.map(card=>card.setName))]
  const languagesUsed=[...new Set(cards.map(card=>languageName[card.language]??card.language))]
  const cover='<section class="print-page cover-page"><div class="cover-band"></div><div class="cover-content"><p class="brand">PokéValue · Classeur Pokémon TCG</p><h1>'+escapeHtml(title)+'</h1><p class="subtitle">Inventaire personnel classé par extension et langue</p><p class="cover-date">Édité le '+escapeHtml(generated)+' · '+escapeHtml(imageSize==='large'?'Grandes images':imageSize==='medium'?'Images moyennes':imageSize==='small'?'Petites images':'Sans image')+'</p><div class="cover-stats"><div><b>'+cards.length+'</b><span>cartes listées</span></div><div><b>'+totalCopies+'</b><span>exemplaires possédés</span></div><div><b>'+ownedCount+'</b><span>possédées</span></div><div><b>'+missingCount+'</b><span>manquantes</span></div></div><div class="cover-info"><strong>Extensions</strong><p>'+escapeHtml(setNames.join(' · '))+'</p><strong>Langues</strong><p>'+escapeHtml(languagesUsed.join(' · '))+'</p></div><p class="cover-note">Document créé avec PokéValue. Les prix indiqués sont uniquement ceux saisis manuellement.</p></div></section>'
  const css='@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font:8pt Arial,Helvetica,sans-serif;color:#172033;background:#fff}.pdf-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;margin:0 auto 12px;max-width:900px;background:#172033;border-radius:12px;color:#fff}.pdf-toolbar a,.pdf-toolbar button{font:600 14px Arial,sans-serif;color:#fff;text-decoration:none;background:#29364c;border:1px solid #526078;border-radius:9px;padding:10px 12px;cursor:pointer}.pdf-toolbar button{background:#ed514b;border-color:#ed514b}.print-page{position:relative;width:100%;height:281mm;margin:0 0 8mm;padding:0;break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid;background:#fff;overflow:hidden}.print-page:last-of-type{break-after:auto;page-break-after:auto}.cover-page{height:281mm;min-height:0;padding:0 3mm 4mm;overflow:hidden}.cover-band{height:7mm;margin:0 -3mm 9mm;background:#ef514b;border-bottom:1.5mm solid #172033}.cover-content{position:relative;z-index:1;max-width:180mm}.brand{margin:0 0 4mm;color:#d94340;font-size:8pt;font-weight:800;letter-spacing:.17em;text-transform:uppercase}.cover-page h1{max-width:175mm;margin:0 0 3mm;font-size:22pt;line-height:1.08;overflow-wrap:anywhere;color:#172033}.subtitle{margin:0;color:#566276;font-size:10pt}.cover-date{margin:3mm 0 0;color:#778195;font-size:8pt}.cover-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:9mm 0 0;max-width:180mm}.cover-stats div{min-height:21mm;padding:3mm;border:1px solid #d8deea;border-top:1.5mm solid #ef514b;border-radius:2mm;background:#f7f8fb}.cover-stats b{display:block;font-size:18pt;line-height:1.05;color:#172033}.cover-stats span{display:block;margin-top:1mm;color:#657086;font-size:7pt}.cover-info{margin-top:7mm;max-width:180mm}.cover-info strong{display:block;margin:0 0 1mm;color:#d94340;font-size:7pt;letter-spacing:.1em;text-transform:uppercase}.cover-info p{margin:0 0 4mm;color:#29364c;font-size:8pt;line-height:1.45;overflow-wrap:anywhere}.cover-note{margin:6mm 0 0;padding-top:3mm;border-top:1px solid #d8deea;color:#778195;font-size:7pt}.set-heading{height:13mm;display:flex;justify-content:space-between;align-items:center;margin:0 0 3mm;border-bottom:1px solid #cbd2dc}.set-heading h2{margin:0;font-size:11pt}.set-heading>b{color:#687386;font-size:7pt;text-align:right}.eyebrow{margin:0 0 .5mm;color:#e4504b;font-size:6pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.cards{display:grid!important;grid-template-columns:repeat(var(--columns),minmax(0,1fr))!important;grid-auto-rows:var(--card-height);gap:var(--card-gap);align-content:start;break-inside:avoid;page-break-inside:avoid}.card{height:var(--card-height);min-height:0;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:1mm;padding:1.5mm;border:1px solid #dce1e9;border-radius:1.5mm;background:#fff;break-inside:avoid;page-break-inside:avoid}.details{width:100%;min-width:0;flex:0 0 auto;overflow:hidden}.details h3{margin:0 0 1mm;font-size:7pt;line-height:1.15;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;overflow-wrap:anywhere}.details p{margin:0 0 .8mm;color:#687386;font-size:6pt;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.facts{display:flex;flex-wrap:wrap;gap:.8mm 1.2mm;max-height:7mm;overflow:hidden;color:#5a6576;font-size:5.5pt;line-height:1.1}.visual{width:15mm;flex:0 0 auto;height:auto;aspect-ratio:63/88;overflow:hidden;display:grid;place-items:center;background:#f1f3f7;border-radius:.7mm;align-self:center}.visual img{display:block;width:100%;height:100%;object-fit:contain}.cards-large .card{gap:1mm;padding:1mm}.cards-large .visual{width:27mm;height:37.7mm;aspect-ratio:63/88}.cards-large .details{width:100%;flex:0 0 auto}.cards-medium .visual{width:19mm}.cards-small .visual{width:9.5mm}.cards-none .visual{display:none!important}.cards-none .card{padding:1mm}.pdf-toolbar button:disabled{opacity:.7;cursor:wait}@media screen{body{background:#e8ebf1;padding:10px 0 24px}.pdf-toolbar{position:sticky;top:8px;z-index:3}.print-page{width:194mm;min-height:0;margin:12px auto;padding:8mm;box-shadow:0 4px 20px rgba(24,35,55,.16)}.cover-page{width:194mm;padding:0 8mm 8mm}.cover-band{margin:0 -8mm 13mm}}@media screen and (max-width:600px){.pdf-toolbar{margin:0 10px 10px;align-items:stretch;flex-direction:column}.pdf-toolbar a,.pdf-toolbar button{text-align:center}.print-page{width:100%;padding:6mm;overflow:hidden}.cover-page{padding:0 6mm 6mm}.cover-band{margin:0 -6mm 10mm}.cover-art{width:32mm;height:32mm;right:5mm;top:15mm}.cover-page h1{font-size:21pt;max-width:110mm}.cover-stats{grid-template-columns:repeat(2,1fr);gap:2mm;margin-top:8mm}.cover-info{margin-top:6mm}.cover-note{margin-top:5mm}}@media print{.pdf-toolbar{display:none!important}.print-page{width:100%;height:281mm;margin:0;padding:0;box-shadow:none;overflow:hidden;break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid}.cover-page{height:281mm;padding:0 3mm 4mm;min-height:0}.cover-band{margin-left:-3mm;margin-right:-3mm}.cards{display:grid!important;grid-template-columns:repeat(var(--columns),minmax(0,1fr))!important;grid-auto-rows:var(--card-height)!important;gap:var(--card-gap)!important}.card{display:flex!important;flex-direction:column!important;break-inside:avoid!important;page-break-inside:avoid!important}.hint{display:none!important}.print-page:last-of-type{break-after:auto;page-break-after:auto}}'
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(title)+' · PokéValue</title><style>'+css+'</style></head><body><nav class="pdf-toolbar"><a href="'+escapeHtml(returnUrl)+'">← Retour à PokéValue</a><button type="button" id="print-pdf">Imprimer / Enregistrer en PDF</button></nav>'+cover+pages.join('')+'<script>document.getElementById("print-pdf").addEventListener("click",async event=>{const button=event.currentTarget;button.disabled=true;button.textContent="Préparation de l’impression…";try{await Promise.all([...document.images].map(img=>img.decode().catch(()=>undefined)));await document.fonts.ready;window.print()}finally{button.disabled=false;button.textContent="Imprimer / Enregistrer en PDF"}});</script></body></html>'
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
      else if(printWindow)printPdf(printWindow,cards,title,imageSize,window.location.href)
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
