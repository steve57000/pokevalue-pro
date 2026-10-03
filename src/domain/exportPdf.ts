export type PdfCard = {
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
  condition?: string
  notes?: string
  manualPrice?: number
  owned: boolean
}
export type PdfImageSize = 'none' | 'small' | 'medium' | 'large'

const PAGE_W = 595.28
const PAGE_H = 841.89
const PIXELS_PER_POINT = 2
const CANVAS_W = Math.round(PAGE_W * PIXELS_PER_POINT)
const CANVAS_H = Math.round(PAGE_H * PIXELS_PER_POINT)
const languageNames: Record<string, string> = { fr: 'Français', en: 'Anglais', ja: 'Japonais', 'zh-tw': 'Chinois traditionnel' }
const layouts: Record<PdfImageSize, { columns: number; rows: number; imageHeight: number }> = {
  large: { columns: 3, rows: 3, imageHeight: 112 },
  medium: { columns: 4, rows: 4, imageHeight: 76 },
  small: { columns: 5, rows: 5, imageHeight: 53 },
  none: { columns: 5, rows: 7, imageHeight: 0 },
}
const encoder = new TextEncoder()
const toBytes = (value: string) => encoder.encode(value)
const concatBytes = (chunks: Uint8Array[]) => {
  const result = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length }
  return result
}
const languageName = (id: string) => languageNames[id] ?? id
const setCanvasFont = (ctx: CanvasRenderingContext2D, size: number, weight = 400) => {
  ctx.font = weight + ' ' + size + 'px Arial, "Helvetica Neue", sans-serif'
}
function wrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 3) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate
    else { lines.push(line); line = word }
    if (lines.length === maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1]
    while (last.length > 2 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1)
    lines[maxLines - 1] = last + '…'
  }
  return lines
}
function drawWrapped(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines = 3) {
  const lines = wrappedLines(ctx, text, width, maxLines)
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
  return lines.length
}
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
}
function newPage() {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Impossible de préparer les pages PDF sur cet appareil.')
  ctx.scale(PIXELS_PER_POINT, PIXELS_PER_POINT)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)
  return { canvas, ctx }
}
async function imageFor(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return null
  return new Promise(resolve => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    const timeout = window.setTimeout(() => resolve(null), 9000)
    image.onload = () => { window.clearTimeout(timeout); resolve(image) }
    image.onerror = () => { window.clearTimeout(timeout); resolve(null) }
    image.src = src
  })
}
function drawCover(ctx: CanvasRenderingContext2D, title: string, cards: PdfCard[], size: PdfImageSize, generated: string) {
  ctx.fillStyle = '#ef514b'; ctx.fillRect(0, 0, PAGE_W, 15)
  ctx.fillStyle = '#172033'; ctx.fillRect(0, 15, PAGE_W, 4)
  const margin = 38
  ctx.fillStyle = '#d94340'; setCanvasFont(ctx, 10, 700)
  ctx.fillText('POKÉVALUE  ·  CLASSEUR POKÉMON TCG', margin, 63)
  ctx.fillStyle = '#172033'; setCanvasFont(ctx, 25, 700)
  const titleLines = drawWrapped(ctx, title, margin, 105, PAGE_W - margin * 2, 31, 3)
  let y = 105 + titleLines * 31 + 8
  ctx.fillStyle = '#566276'; setCanvasFont(ctx, 12)
  ctx.fillText('Inventaire personnel classé par extension et langue', margin, y)
  y += 25
  ctx.fillStyle = '#778195'; setCanvasFont(ctx, 9)
  ctx.fillText('Édité le ' + generated + ' · ' + ({ large: 'Grandes images', medium: 'Images moyennes', small: 'Petites images', none: 'Sans image' }[size]), margin, y)
  const owned = cards.filter(card => card.owned).length
  const copies = cards.reduce((sum, card) => sum + (card.owned ? card.quantity : 0), 0)
  const stats = [
    [String(cards.length), 'cartes listées'],
    [String(copies), 'exemplaires possédés'],
    [String(owned), 'possédées'],
    [String(cards.length - owned), 'manquantes'],
  ]
  const boxY = y + 45
  const gap = 10
  const boxW = (PAGE_W - margin * 2 - gap * 3) / 4
  stats.forEach(([value, label], index) => {
    const x = margin + index * (boxW + gap)
    roundedRect(ctx, x, boxY, boxW, 62, 8)
    ctx.fillStyle = '#f5f7fa'; ctx.fill()
    ctx.strokeStyle = '#d8deea'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = '#ef514b'; ctx.fillRect(x, boxY, boxW, 4)
    ctx.fillStyle = '#172033'; setCanvasFont(ctx, 20, 700); ctx.fillText(value, x + 12, boxY + 31)
    ctx.fillStyle = '#657086'; setCanvasFont(ctx, 8); ctx.fillText(label, x + 12, boxY + 48)
  })
  const sets = [...new Set(cards.map(card => card.setName))]
  const langs = [...new Set(cards.map(card => languageName(card.language)))]
  let infoY = boxY + 95
  const drawGroup = (label: string, value: string) => {
    ctx.fillStyle = '#d94340'; setCanvasFont(ctx, 9, 700); ctx.fillText(label.toLocaleUpperCase('fr'), margin, infoY)
    infoY += 17
    ctx.fillStyle = '#29364c'; setCanvasFont(ctx, 10)
    const count = drawWrapped(ctx, value || '—', margin, infoY, PAGE_W - margin * 2, 15, 5)
    infoY += count * 15 + 14
  }
  drawGroup('Extensions', sets.join(' · '))
  drawGroup('Langues', langs.join(' · '))
  ctx.strokeStyle = '#d8deea'; ctx.beginPath(); ctx.moveTo(margin, infoY + 2); ctx.lineTo(PAGE_W - margin, infoY + 2); ctx.stroke()
  ctx.fillStyle = '#778195'; setCanvasFont(ctx, 8)
  ctx.fillText('Document créé avec PokéValue. Les prix indiqués sont ceux saisis manuellement.', margin, infoY + 18)
  ctx.fillStyle = '#a4adba'; setCanvasFont(ctx, 7); ctx.fillText('PokéValue · ' + generated, margin, PAGE_H - 22)
}
function drawCard(ctx: CanvasRenderingContext2D, card: PdfCard, x: number, y: number, w: number, h: number, imageHeight: number, image?: HTMLImageElement | null) {
  roundedRect(ctx, x, y, w, h, 5)
  ctx.fillStyle = '#ffffff'; ctx.fill()
  ctx.strokeStyle = '#dce1e9'; ctx.lineWidth = 0.8; ctx.stroke()
  const pad = 8
  let textY = y + 16
  if (imageHeight > 0) {
    const areaX = x + pad, areaY = y + 8, areaW = w - pad * 2
    const targetH = Math.min(imageHeight, h * 0.62)
    if (image) {
      const scale = Math.min(areaW / image.naturalWidth, targetH / image.naturalHeight)
      const drawW = image.naturalWidth * scale
      const drawH = image.naturalHeight * scale
      ctx.drawImage(image, areaX + (areaW - drawW) / 2, areaY + (targetH - drawH) / 2, drawW, drawH)
    } else {
      roundedRect(ctx, areaX + areaW * .22, areaY, areaW * .56, targetH, 4)
      ctx.fillStyle = '#f1f3f7'; ctx.fill()
      ctx.strokeStyle = '#dce1e9'; ctx.stroke()
      ctx.fillStyle = '#ef514b'; setCanvasFont(ctx, Math.min(14, w * .13), 700)
      ctx.textAlign = 'center'; ctx.fillText('PV', x + w / 2, areaY + targetH / 2 + 5); ctx.textAlign = 'left'
    }
    textY = areaY + targetH + 10
  }
  const textW = w - pad * 2
  ctx.fillStyle = '#172033'; setCanvasFont(ctx, Math.max(7, Math.min(10, w * .075)), 700)
  const nameLines = drawWrapped(ctx, card.name, x + pad, textY, textW, 11, 2)
  textY += nameLines * 11 + 3
  ctx.fillStyle = '#687386'; setCanvasFont(ctx, 7.3)
  ctx.fillText('N° ' + (card.number || '—'), x + pad, textY)
  textY += 11
  ctx.fillStyle = card.owned ? '#258455' : '#687386'; setCanvasFont(ctx, 7.3, 600)
  ctx.fillText(card.owned ? 'Possédée ×' + card.quantity : 'Manquante', x + pad, textY)
  textY += 10
  ctx.fillStyle = '#687386'; setCanvasFont(ctx, 6.7)
  const extra = [card.rarity, card.condition ? 'État : ' + card.condition : '', card.manualPrice !== undefined ? card.manualPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : ''].filter(Boolean)
  if (extra.length && textY < y + h - 5) drawWrapped(ctx, extra.join(' · '), x + pad, textY, textW, 9, 2)
}
async function canvasJpeg(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88))
  if (!blob) throw new Error('Impossible de convertir les pages PDF sur cet appareil.')
  return new Uint8Array(await blob.arrayBuffer())
}
async function makePdf(pageJpegs: Uint8Array[]) {
  const chunks: Uint8Array[] = [toBytes('%PDF-1.4\n% PokéValue\n')]
  const offsets: number[] = [0]
  let length = chunks[0].length
  const append = (bytes: Uint8Array) => { chunks.push(bytes); length += bytes.length }
  const object = (id: number, body: string) => {
    offsets[id] = length
    append(toBytes(id + ' 0 obj\n' + body + '\nendobj\n'))
  }
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  const kids = pageJpegs.map((_, index) => (5 + index * 3) + ' 0 R').join(' ')
  object(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + pageJpegs.length + ' >>')
  for (let index = 0; index < pageJpegs.length; index++) {
    const imageId = 3 + index * 3, contentId = imageId + 1, pageId = imageId + 2
    const jpeg = pageJpegs[index]
    offsets[imageId] = length
    append(toBytes(imageId + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + CANVAS_W + ' /Height ' + CANVAS_H + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n'))
    append(jpeg); append(toBytes('\nendstream\nendobj\n'))
    const stream = 'q\n' + PAGE_W + ' 0 0 ' + PAGE_H + ' 0 0 cm\n/Im0 Do\nQ\n'
    object(contentId, '<< /Length ' + toBytes(stream).length + ' >>\nstream\n' + stream + 'endstream')
    object(pageId, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H + '] /Resources << /XObject << /Im0 ' + imageId + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>')
  }
  const xref = length
  const count = 3 + pageJpegs.length * 3
  let table = 'xref\n0 ' + count + '\n0000000000 65535 f \n'
  for (let id = 1; id < count; id++) table += String(offsets[id]).padStart(10, '0') + ' 00000 n \n'
  table += 'trailer\n<< /Size ' + count + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF'
  append(toBytes(table))
  return new Blob([concatBytes(chunks)], { type: 'application/pdf' })
}
export async function buildCollectionPdf(cards: PdfCard[], title: string, size: PdfImageSize) {
  if (!cards.length) throw new Error('Aucune carte à exporter.')
  const layout = layouts[size]
  const margin = 30, headerBottom = 66, bottom = 30, gapX = 9, gapY = 9
  const cellW = (PAGE_W - margin * 2 - gapX * (layout.columns - 1)) / layout.columns
  const cellH = (PAGE_H - headerBottom - bottom - gapY * (layout.rows - 1)) / layout.rows
  const images = new Map<string, Promise<HTMLImageElement | null>>()
  const getImage = (card: PdfCard) => {
    const source = card.image || ''
    if (!images.has(source)) images.set(source, imageFor(source))
    return images.get(source)!
  }
  const pages: Uint8Array[] = []
  {
    const { canvas, ctx } = newPage()
    drawCover(ctx, title, cards, size, new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))
    pages.push(await canvasJpeg(canvas))
  }
  const groups = new Map<string, PdfCard[]>()
  cards.forEach(card => {
    const key = JSON.stringify([card.setName, card.language])
    groups.set(key, [...(groups.get(key) ?? []), card])
  })
  for (const [key, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'))) {
    const [setName, language] = JSON.parse(key) as [string, string]
    group.sort((a, b) => (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true }) || a.name.localeCompare(b.name, 'fr'))
    const pageCount = Math.ceil(group.length / (layout.columns * layout.rows))
    const copies = group.reduce((sum, card) => sum + (card.owned ? card.quantity : 0), 0)
    for (let start = 0; start < group.length; start += layout.columns * layout.rows) {
      const pageIndex = Math.floor(start / (layout.columns * layout.rows)) + 1
      const { canvas, ctx } = newPage()
      const pageCards = group.slice(start, start + layout.columns * layout.rows)
      ctx.fillStyle = '#d94340'; setCanvasFont(ctx, 7.5, 700); ctx.fillText(languageName(language).toLocaleUpperCase('fr'), margin, 27)
      ctx.fillStyle = '#172033'; setCanvasFont(ctx, 14, 700); ctx.fillText(setName, margin, 47)
      ctx.fillStyle = '#687386'; setCanvasFont(ctx, 7)
      ctx.textAlign = 'right'; ctx.fillText(group.length + ' cartes · ' + copies + ' exemplaires · page ' + pageIndex + '/' + pageCount, PAGE_W - margin, 43); ctx.textAlign = 'left'
      ctx.strokeStyle = '#cbd2dc'; ctx.beginPath(); ctx.moveTo(margin, 56); ctx.lineTo(PAGE_W - margin, 56); ctx.stroke()
      for (let i = 0; i < pageCards.length; i++) {
        const col = i % layout.columns, row = Math.floor(i / layout.columns)
        const x = margin + col * (cellW + gapX)
        const y = headerBottom + row * (cellH + gapY)
        const card = pageCards[i]
        const image = size === 'none' ? null : await getImage(card)
        drawCard(ctx, card, x, y, cellW, cellH, layout.imageHeight, image)
      }
      ctx.fillStyle = '#a4adba'; setCanvasFont(ctx, 7); ctx.fillText('PokéValue · ' + languageName(language), margin, PAGE_H - 15)
      pages.push(await canvasJpeg(canvas))
    }
  }
  return makePdf(pages)
}
