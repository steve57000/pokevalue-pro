import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/data/cardImageOverrides.ts', import.meta.url), 'utf8')
const identities = [...source.matchAll(/cardId:'(30th-c-\\d{3})'/g)].map(match => match[1])
const scanMap = source.match(/const classicOriginalScans:Record<string,string>=\\{([\\s\\S]*?)\\}/)?.[1] ?? ''
const scans = [...scanMap.matchAll(/'(30th-c-\\d{3})':'([^']+)'/g)]
const mappedCards = new Set(scans.map(match => match[1]))
const uniqueImages = new Set(scans.map(match => match[2]))
const errors = []

if (identities.length !== 30 || new Set(identities).size !== 30) errors.push(`Le manifeste doit contenir 30 identités uniques (reçu ${identities.length}).`)
if (scans.length !== 30 || mappedCards.size !== 30 || uniqueImages.size !== 30) errors.push(`Les 30 références de scans doivent être présentes et uniques (reçu ${scans.length}).`)
for (const id of identities) if (!mappedCards.has(id)) errors.push(`${id}: référence de scan absente.`)
if (!source.includes("source:'Bill’s Archive / TCGdex original scan'")) errors.push('Attribution Bill’s Archive / TCGdex absente.')
if (scans.some(([, url]) => !url.startsWith('https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/') || !url.endsWith('.webp'))) errors.push('Un scan ne pointe pas vers le CDN WebP attendu.')
if (errors.length) {
  errors.forEach(error => console.error(error))
  process.exitCode = 1
} else {
  console.log('30th-c : 30 cartes · 30 scans WebP uniques et attribués · vérification réseau des images non incluse.')
}
