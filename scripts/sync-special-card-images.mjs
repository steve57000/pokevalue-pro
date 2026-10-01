// Exact 30th-anniversary assets are intentionally not synthesized from historical printings.
// Add an image block to the manifest only after its source and reprint artwork are verified.
import {readFile} from 'node:fs/promises'
const manifest=await readFile(new URL('../src/data/cardImageOverrides.ts',import.meta.url),'utf8')
const exact=[...manifest.matchAll(/cardId:'(30th-c-\d{3})'[\s\S]*?image:\{[^}]+verified:true\}/g)]
console.log(`${exact.length} visuel(s) exact(s) déclaré(s). Aucun original historique ne sera téléchargé comme substitut.`)
