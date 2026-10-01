import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/data/cardImageOverrides.ts', import.meta.url), 'utf8')
const identities = [...source.matchAll(/cardId:'(30th-c-\d{3})'/g)].map(match => match[1])
const productMap = source.match(/const classicProductIds:Record<string,number>=\{([\s\S]*?)\}/)?.[1] ?? ''
const productIds = [...productMap.matchAll(/'(30th-c-\d{3})':(\d+)/g)]
const mappedCards = new Set(productIds.map(match => match[1]))
const uniqueProducts = new Set(productIds.map(match => match[2]))
const errors = []

if (identities.length !== 30 || new Set(identities).size !== 30) errors.push(`Le manifeste doit contenir 30 identités uniques (reçu ${identities.length}).`)
if (productIds.length !== 30 || mappedCards.size !== 30 || uniqueProducts.size !== 30) errors.push(`Les 30 identifiants d'images doivent être présents et uniques (reçu ${productIds.length}).`)
for (const id of identities) if (!mappedCards.has(id)) errors.push(`${id}: référence d'image absente.`)
if (!source.includes("source:'TCGplayer product image'")) errors.push('Attribution TCGplayer absente.')
if (errors.length) {
  errors.forEach(error => console.error(error))
  process.exitCode = 1
} else {
  console.log('30th-c : 30 cartes · 30 références d’images produit uniques et attribuées · vérification réseau des images non incluse.')
}
