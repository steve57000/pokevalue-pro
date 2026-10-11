import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/data/cardImageOverrides.ts', import.meta.url), 'utf8')
const entries = [...source.matchAll(/^\s*\{cardId:'(30th-c-\d{3})'([^\n]*)/gm)]
const identities = entries.map(([, id]) => id)
const errors = []

if (identities.length !== 30 || new Set(identities).size !== 30) {
  errors.push(`Le manifeste doit contenir 30 identités uniques (reçu ${identities.length}).`)
}
if (source.includes('classicOriginalScans')) {
  errors.push('Les scans des impressions historiques ne doivent pas être attribués aux cartes 30th-c.')
}
for (const [, id, fields] of entries) {
  if (!fields.includes('verified:false') || fields.includes('image:')) {
    errors.push(`${id}: aucun scan exact vérifié n’est disponible; ne pas déclarer d’image de remplacement.`)
  }
}

if (errors.length) {
  errors.forEach(error => console.error(error))
  process.exitCode = 1
} else {
  console.log('30th-c : 30 identités · aucun scan d’une autre impression déclaré · vérification réseau non incluse.')
}
