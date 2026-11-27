import {test} from 'vitest'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseReviewedFeed,mergePublishedFeed} from './publish-reviewed-prices.mjs'
const baseline = JSON.parse(readFileSync('src/data/reviewedDeltaPrices.json','utf8'))
const rows = () => [...baseline.cards.map(card=>({localId:card.number,cardmarketUrl:card.marketUrl,priceLowFr:card.fr.value,pricedAtFr:card.fr.updatedAt,offerCountFr:card.fr.offers,priceLowEn:card.en.value,pricedAtEn:card.en.updatedAt,offerCountEn:card.en.offers})),{localId:'132',cardmarketUrl:'https://www.cardmarket.com/incorrect-energy'}]
const encode = value => Array.isArray(value) ? [1,value.map(encode)] : value && typeof value==='object' ? [0,Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]))] : [0,value]
const html = rows => `<astro-island component-url="/set-explorer.js" props='${JSON.stringify({cards:encode(rows)}).replaceAll('&','&amp;').replaceAll("'",'&#39;')}'></astro-island>`
test('updates public French and English observations without admitting an unreviewed product',()=>{
 const next=rows(); next[0].priceLowFr=45;next[0].pricedAtFr='2026-11-26T09:00:00Z'
 const feed=parseReviewedFeed(html(next),baseline,'2026-11-26T12:00:00Z')
 assert.equal(feed.cards.length,140);assert.equal(feed.cards[0].fr.value,45);assert.equal(feed.cards[0].en.value,baseline.cards[0].en.value)
 assert.equal(feed.cards.some(card=>card.id==='me06-132'),false)
})
test('retains the newer source observation when the upstream cache is older',()=>{
 const next=rows();next[0].priceLowFr=1;next[0].pricedAtFr='2020-01-01'
 assert.deepEqual(parseReviewedFeed(html(next),baseline).cards[0].fr,baseline.cards[0].fr)
})
test('rejects incomplete pages and changed product mappings before publishing',()=>{
 assert.throws(()=>parseReviewedFeed('<html></html>',baseline))
 assert.throws(()=>parseReviewedFeed(html(rows().slice(1)),baseline))
 const next=rows();next[0].cardmarketUrl=next[1].cardmarketUrl
 assert.throws(()=>parseReviewedFeed(html(next),baseline),/Correspondance/)
})
test('rejects invalid or future source observations',()=>{
 for(const patch of [{priceLowFr:0},{priceLowFr:NaN},{offerCountFr:0},{pricedAtFr:'2099-01-01'}]) {
  const next=rows();Object.assign(next[0],patch)
  assert.throws(()=>parseReviewedFeed(html(next),baseline,'2026-11-26T12:00:00Z'),/invalide/)
 }
})

test('preserves a newer published feed when a scheduled source refresh cannot run',()=>{
 const published=structuredClone(baseline)
 published.cards[0].fr={value:42,offers:3,updatedAt:'2026-11-26T10:00:00Z'}
 const restored=mergePublishedFeed(baseline,published,Date.parse('2026-11-26T12:00:00Z'))
 assert.equal(restored.cards[0].fr.value,42)
 assert.equal(mergePublishedFeed(restored,baseline).cards[0].fr.value,42)
 published.cards[0].marketUrl='https://example.com/wrong'
 assert.equal(mergePublishedFeed(baseline,published).cards[0].fr.value,baseline.cards[0].fr.value)
})
