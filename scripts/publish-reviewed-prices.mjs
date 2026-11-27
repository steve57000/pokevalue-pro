import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs'
import {JSDOM} from 'jsdom'
import {pathToFileURL} from 'node:url'

export function mergePublishedFeed(baseline, incoming, now = Date.now()) {
  if (incoming?.schemaVersion !== 1 || incoming.sourceUrl !== baseline.sourceUrl || !Array.isArray(incoming.cards)) return baseline
  const byId = new Map(incoming.cards.map(card=>[card.id,card]))
  return {...baseline,cards:baseline.cards.map(known=>{
    const card=byId.get(known.id),next={...known}
    if (!card || card.marketUrl!==known.marketUrl || card.number!==known.number) return known
    for (const language of ['fr','en']) {
      const quote=card[language],time=Date.parse(quote?.updatedAt)
      if (Number.isFinite(quote?.value)&&quote.value>0&&Number.isInteger(quote.offers)&&quote.offers>0&&time<=now&&time>Date.parse(known[language].updatedAt)) next[language]=quote
    }
    return next
  })}
}

export function parseReviewedFeed(html, baseline, now = new Date().toISOString()) {
  const document = new JSDOM(html).window.document
  const island = [...document.querySelectorAll('astro-island')].find(node=>node.getAttribute('component-url')?.includes('set-explorer'))
  if (!island) throw new Error('Liste des cartes absente de la source')
  const decode = ([type,value]) => {
    if (type === 1) return value.map(decode)
    if (type === 0 && value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decode(item)]))
    if (type === 0) return value
    throw new Error('Format source inconnu')
  }
  const rows = decode(JSON.parse(island.getAttribute('props')).cards)
  if (rows.length !== 141 || new Set(rows.map(row=>String(row.localId).padStart(3,'0'))).size !== 141) throw new Error('Extension source incomplète')
  const byNumber = new Map(rows.map(row=>[String(row.localId).padStart(3,'0'),row]))
  const cards = baseline.cards.map(known=>{
    const row = byNumber.get(known.number)
    if (!row || row.cardmarketUrl !== known.marketUrl) throw new Error(`Correspondance modifiée : ${known.id}`)
    const next = {...known}
    for (const [language,suffix] of [['fr','Fr'],['en','En']]) {
      const value = row[`priceLow${suffix}`], updatedAt = row[`pricedAt${suffix}`], offers = row[`offerCount${suffix}`]
      const time = Date.parse(updatedAt)
      if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(time) || time > Date.parse(now) || !Number.isInteger(offers) || offers < 1) throw new Error(`Prix source invalide : ${known.id}:${language}`)
      if (time >= Date.parse(known[language].updatedAt)) next[language] = {value,updatedAt,offers}
    }
    return next
  })
  return {...baseline,capturedAt:now,cards}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = 'public/prices/reviewed-delta.json'
  const baseline = JSON.parse(readFileSync('src/data/reviewedDeltaPrices.json','utf8'))
  let feed = existsSync(target) ? JSON.parse(readFileSync(target,'utf8')) : baseline
  if (process.argv.includes('--fetch')) {
    // Preserve the last deployment if the upstream site is temporarily unavailable.
    // Only public market data is fetched; the private backup is never involved.
    try {
      const previous=await fetch('https://steve57000.github.io/pokevalue-pro/prices/reviewed-delta.json',{signal:AbortSignal.timeout(10000),cache:'no-store'})
      if (previous.ok) feed=mergePublishedFeed(feed,await previous.json())
    } catch { /* First deployment or unavailable previous artifact: retain bundled observations. */ }
    try {
      const response = await fetch(baseline.sourceUrl,{signal:AbortSignal.timeout(20000),headers:{Accept:'text/html'}})
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      feed = parseReviewedFeed(await response.text(),feed)
      console.log(`Relevé public actualisé : ${feed.cards.length} cartes FR / EN.`)
    } catch (error) {
      console.warn(`::warning::Source indisponible ou modifiée : relevé précédent conservé (${error.message}).`)
    }
  }
  mkdirSync('public/prices',{recursive:true})
  writeFileSync(target,JSON.stringify(feed)+'\n')
}
