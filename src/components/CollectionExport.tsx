import { Download, FileText } from 'lucide-react'
import type { CollectionEntry } from '../domain/collection'

type Props = { entries: CollectionEntry[] }

const languageName: Record<string, string> = { fr: 'Français', en: 'Anglais', ja: 'Japonais', 'zh-tw': 'Chinois traditionnel' }
const conditionName: Record<CollectionEntry['condition'], string> = { mint: 'Mint', 'near-mint': 'Near Mint', excellent: 'Excellent', good: 'Bon', played: 'Joué', poor: 'Abîmé' }
const safeImage = (value?: string) => value && (/^https:\/\//i.test(value) || value.startsWith('/')) ? value : ''
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const csvCell = (value: unknown) => {
  let text = String(value ?? '')
  if (/^[=+@-]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}
const cardNumber = (entry: CollectionEntry) => entry.number ?? ''

function downloadCsv(entries: CollectionEntry[]) {
  const header = ['Extension', 'Langue', 'N° de carte', 'Pokémon', 'Variante', 'Quantité', 'État', 'Prix manuel (€)', 'Mode de prix', 'Notes', 'URL image', 'ID carte']
  const rows = entries.map(entry => [
    entry.setName, languageName[entry.language] ?? entry.language, cardNumber(entry), entry.name, entry.variant,
    entry.quantity, conditionName[entry.condition], entry.manualPrice ?? '', entry.priceMode ?? (entry.manualPrice !== undefined ? 'manual' : 'market'),
    entry.notes, safeImage(entry.image), entry.cardId,
  ])
  const csv = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `pokevalue-collection-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function printCollection(entries: CollectionEntry[]) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    window.alert('Autorise les fenêtres surgissantes pour créer le PDF, puis choisis « Enregistrer en PDF » dans la fenêtre d’impression.')
    return
  }
  const groups = new Map<string, CollectionEntry[]>()
  for (const entry of entries) {
    const groupKey = `${entry.setName}||${entry.language}`
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), entry])
  }
  const sections = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([key, cards]) => {
      const [setName, language] = key.split('||')
      const count = cards.reduce((sum, card) => sum + card.quantity, 0)
      const list = cards.sort((a, b) => a.number?.localeCompare(b.number ?? '', undefined, { numeric: true }) ?? a.name.localeCompare(b.name, 'fr')).map(card => {
        const image = safeImage(card.image)
        const price = card.manualPrice !== undefined ? `<span>Prix manuel : ${escapeHtml(card.manualPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))}</span>` : ''
        return `<article class="card">
          <div class="visual">${image ? `<img src="${escapeHtml(image)}" alt="" />` : '<div class="placeholder">Visuel indisponible</div>'}</div>
          <div class="details"><h3>${escapeHtml(card.name)}</h3><p>${escapeHtml(card.setName)} · Nº ${escapeHtml(card.number || '—')}</p>
          <div class="facts"><b>Quantité ×${card.quantity}</b><span>État : ${conditionName[card.condition]}</span>${price}</div>
          ${card.notes ? `<p class="notes">${escapeHtml(card.notes)}</p>` : ''}</div>
        </article>`
      }).join('')
      return `<section class="set"><header><div><p class="eyebrow">${languageName[language] ?? escapeHtml(language)}</p><h2>${escapeHtml(setName)}</h2></div><b>${cards.length} cartes · ${count} exemplaires</b></header><div class="cards">${list}</div></section>`
    }).join('')
  const totalCopies = entries.reduce((sum, entry) => sum + entry.quantity, 0)
  const generated = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  printWindow.document.open()
  printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collection Pokémon · PokéValue</title>
  <style>
    @page{size:A4;margin:12mm}
    *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;background:#fff;font-size:10pt}
    .cover{padding:8mm 0 6mm;border-bottom:2px solid #ef514b;margin-bottom:8mm}.brand{color:#eb514c;font-size:9pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
    h1{font-size:27pt;line-height:1.1;margin:3mm 0}.subtitle{color:#637086;margin:0}.totals{display:flex;gap:10mm;margin-top:6mm}.totals b{display:block;font-size:14pt}
    .set{margin:0 0 8mm;break-inside:auto}.set>header{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid #cbd2dc;padding-bottom:2mm;margin-bottom:3mm;break-after:avoid}
    .set>header h2{font-size:16pt;margin:0}.set>header>b{font-size:9pt;color:#687386}.eyebrow{font-size:8pt;color:#e4504b;text-transform:uppercase;letter-spacing:.1em;margin:0 0 1mm;font-weight:700}
    .cards{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.card{display:flex;gap:3mm;border:1px solid #dce1e9;border-radius:3mm;padding:2.5mm;min-height:37mm;break-inside:avoid}
    .visual{width:23mm;flex:0 0 23mm;aspect-ratio:63/88;background:#f1f3f7;border-radius:1.5mm;overflow:hidden;display:grid;place-items:center}
    .visual img{width:100%;height:100%;object-fit:contain}.placeholder{font-size:6pt;color:#7b8594;text-align:center;padding:2mm}
    .details{min-width:0}.details h3{font-size:10pt;margin:0 0 1mm}.details p{font-size:7.5pt;color:#687386;margin:0 0 2mm}
    .facts{display:flex;flex-direction:column;gap:1mm;font-size:7pt;color:#5a6576}.facts b{color:#233047;font-size:8pt}.notes{border-top:1px solid #e4e7ed;padding-top:1.5mm!important;font-style:italic}
    footer{margin-top:6mm;border-top:1px solid #dce1e9;padding-top:2mm;color:#7a8493;font-size:7pt}
    @media screen{body{max-width:900px;margin:24px auto;padding:0 22px}.cover{background:#f6f7fb;padding:24px;border-radius:14px}.print-hint{display:block;margin:14px 0;padding:12px;border:1px solid #cad3e1;border-radius:10px;color:#48566b}.cards{gap:10px}.card{padding:10px}.visual{width:90px;flex-basis:90px}}
    @media print{.print-hint{display:none}}
  </style></head><body><div class="cover"><div class="brand">PokéValue · Classeur personnel</div><h1>Ma collection Pokémon</h1><p class="subtitle">Inventaire classé par extension et langue · généré le ${generated}</p><div class="totals"><div><b>${entries.length}</b> cartes différentes</div><div><b>${totalCopies}</b> exemplaires</div><div><b>${groups.size}</b> groupes série / langue</div></div></div>
  <p class="print-hint">Pour obtenir le PDF : lance l’impression de cette page, puis choisis « Enregistrer en PDF ». Les cartes sans image enregistrée sont signalées. Les prix affichés sont uniquement ceux saisis manuellement ; ils ne remplacent pas une cotation de marché.</p>
  ${sections}<footer>Document personnel créé avec PokéValue. Les valeurs manuelles reflètent uniquement les informations enregistrées dans la collection.</footer><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),700));</script></body></html>`)
  printWindow.document.close()
}

export function CollectionExport({ entries }: Props) {
  const owned = entries.filter(entry => entry.quantity > 0).sort((a, b) => a.setName.localeCompare(b.setName, 'fr') || a.language.localeCompare(b.language) || (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true }))
  return <div className="collection-export">
    <div><strong>Exporter mon classeur</strong><span>{owned.length} cartes · {owned.reduce((sum, entry) => sum + entry.quantity, 0)} exemplaires</span></div>
    <button type="button" onClick={() => downloadCsv(owned)} disabled={owned.length === 0} aria-label="Télécharger l’inventaire au format CSV"><Download size={17}/> Exporter CSV</button>
    <button type="button" onClick={() => printCollection(owned)} disabled={owned.length === 0} aria-label="Imprimer ou enregistrer ma collection en PDF"><FileText size={17}/> Créer le PDF</button>
  </div>
}
