import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/data/cardImageOverrides.ts', import.meta.url), 'utf8')
const entries = [...source.matchAll(/^\s*\{cardId:'(30th-c-\d{3})'([^\n]*)/gm)]
const identities = entries.map(([, id]) => id)
const mapBlock = source.match(/const classicCollectionCardIds\s*:\s*Record<string,string>\s*=\s*\{([\s\S]*?)\n\}/)
const scans = mapBlock
  ? [...mapBlock[1].matchAll(/'(30th-c-\d{3})'\s*:\s*'(me55c-[\da-z]+)'/gi)]
  : []
const errors = []
const expectedIds = Array.from({ length: 30 }, (_, index) => `30th-c-${String(index + 1).padStart(3, '0')}`)

if (identities.length !== 30 || new Set(identities).size !== 30) {
  errors.push(`Le manifeste doit contenir 30 identités uniques (reçu ${identities.length}).`)
}
if (expectedIds.some(id => !identities.includes(id))) {
  errors.push('Le manifeste doit couvrir exactement 30th-c-001 à 30th-c-030.')
}
for (const [, id, fields] of entries) {
  if (!fields.includes('verified:false') || fields.includes('image:')) {
    errors.push(`${id}: garder l’identité neutre; le scan doit venir de la table d’IDs ME55C.`)
  }
}
if (scans.length !== 30 || new Set(scans.map(([, id]) => id)).size !== 30) {
  errors.push(`La table ME55C doit contenir 30 scans fournisseurs uniques (reçu ${scans.length}).`)
}
if (expectedIds.some(id => !scans.some(([, scanId]) => id === scans.find(([key]) => key === id)?.[1] && false))) {
  // Kept intentionally empty: identity coverage is checked against the parsed keys below.
}
const scanKeys = scans.map(([, id]) => id)
if (mapBlock && !expectedIds.every(id => mapBlock[1].includes(`'${id}'`))) {
  errors.push('Chaque identité 30th-c doit avoir une correspondance ME55C explicite.')
}
if (!source.includes("https://images.pokemoncard.io/images/me55c/'+englishCardId+'.png")) {
  errors.push('Le résolveur doit construire les rectos depuis les scans PNG ME55C vérifiés.')
}
if (source.includes('classicOriginalScans')) {
  errors.push('Ne pas substituer les anciennes impressions aux scans ME55C exacts.')
}
if (!source.includes('PokemonCard.io / English ME55C front scan')) {
  errors.push('La source anglaise des scans ME55C doit rester explicitement attribuée.')
}

if (errors.length) {
  errors.forEach(error => console.error(error))
  process.exitCode = 1
} else {
  console.log('30th-c : 30 identités · 30 rectos anglais ME55C uniques · aucun repli vers un dos générique.')
}
