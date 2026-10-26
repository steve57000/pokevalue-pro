// @vitest-environment jsdom
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(()=>{ vi.resetModules(); localStorage.clear(); vi.stubGlobal('indexedDB',new IDBFactory()) })
describe('durable price history',()=>{
  it('migrates every card and older observation, then restores them after a cold start',async()=>{
    const history=await import('./priceHistory')
    const {collectMarketPriceQuotes}=await import('./pricing')
    const points=Array.from({length:800},(_,i)=>history.snapshotsFromQuotes(`card-${i}`,collectMarketPriceQuotes({cardmarket:{trend:i+1}},'fr'),'2026-10-20')[0])
    localStorage.setItem(history.PRICE_HISTORY_STORAGE_KEY,JSON.stringify(points))
    await history.initializePriceHistory()
    expect(history.getAllPriceHistory()).toHaveLength(800)
    expect(localStorage.getItem(history.PRICE_HISTORY_STORAGE_KEY)).toBeNull()
    history.recordPriceSnapshots(history.snapshotsFromQuotes('card-0',collectMarketPriceQuotes({cardmarket:{trend:20}},'fr'),'2026-10-21'))
    await history.flushPriceHistory()
    vi.resetModules()
    const cold=await import('./priceHistory')
    await cold.initializePriceHistory()
    expect(cold.getAllPriceHistory()).toHaveLength(801)
    expect(cold.getPriceHistory('card-0','fr').map(point=>point.value)).toEqual([1,20])
  })
  it('merges prices arriving while the database opens and an older remote write completes',async()=>{
    const history=await import('./priceHistory')
    const {collectMarketPriceQuotes}=await import('./pricing')
    const point=(id:string)=>history.snapshotsFromQuotes(id,collectMarketPriceQuotes({cardmarket:{trend:100}},'fr'))
    const opening=history.initializePriceHistory()
    history.recordPriceSnapshots(point('Dracaufeu'))
    const staleSnapshot=history.getAllPriceHistory()
    history.recordPriceSnapshots(point('Magicarpe'))
    history.replacePriceHistory(staleSnapshot)
    await opening
    await history.flushPriceHistory()
    expect(history.getAllPriceHistory().map(row=>row.cardId).sort()).toEqual(['Dracaufeu','Magicarpe'])
    vi.resetModules()
    const cold=await import('./priceHistory')
    await cold.initializePriceHistory()
    expect(cold.getAllPriceHistory()).toHaveLength(2)
  })
  it('merges concurrent tabs inside the same database transaction',async()=>{
    const {openPriceHistoryDatabase,mergePriceHistoryDatabase,readPriceHistoryDatabase}=await import('../services/priceHistoryDatabase')
    const a=await openPriceHistoryDatabase(),b=await openPriceHistoryDatabase()
    const merge=(stored:unknown,next:string[])=>[...new Set([...(stored as string[]??[]),...next])]
    await Promise.all([mergePriceHistoryDatabase(a,['Dracaufeu'],merge),mergePriceHistoryDatabase(b,['Magicarpe'],merge)])
    expect((await readPriceHistoryDatabase(a) as string[]).sort()).toEqual(['Dracaufeu','Magicarpe'])
    a.close(); b.close()
  })
})
