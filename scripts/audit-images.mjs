// Audit metadata for every French extension. Optional --check-urls also checks each supplied image.
import { writeFile } from 'node:fs/promises'
const base = 'https://api.tcgdex.net/v2/fr'
async function json(url) { const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }
const sets = await json(`${base}/sets`)
const results = []
let index = 0
async function worker() {
  while (index < sets.length) {
    const set = sets[index++]
    try {
      const data = await json(`${base}/sets/${set.id}`)
      const missing = data.cards.filter(card => !card.image).map(card => ({ id:card.id, name:card.name }))
      const broken = []
      if (process.argv.includes('--check-urls')) for (const card of data.cards.filter(card=>card.image)) {
        try { const response = await fetch(`${card.image}/low.webp`, { method:'HEAD',signal:AbortSignal.timeout(12000) }); if (!response.ok) broken.push({id:card.id,status:response.status}) }
        catch (error) { broken.push({id:card.id,error:error.message}) }
      }
      results.push({ id:set.id, name:set.name, count:data.cards.length, missing, broken })
    } catch (error) { results.push({ id:set.id,error:error.message }) }
  }
}
await Promise.all(Array.from({length:4},worker))
await writeFile('docs/image-audit.json', JSON.stringify({checkedAt:new Date().toISOString(),urlChecks:process.argv.includes('--check-urls'),results},null,2))
console.log(`Audit saved: ${results.length} extensions, ${results.filter(r=>r.error).length} request failures.`)
