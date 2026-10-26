// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useGitHubPriceHistorySync } from './useGitHubPriceHistorySync'
import { getAllPriceHistory, recordPriceSnapshots, snapshotsFromQuotes, type PriceSnapshot } from '../domain/priceHistory'
import { collectMarketPriceQuotes } from '../domain/pricing'
import { readRemotePriceHistory, writeRemotePriceHistory } from '../services/githubSync'
vi.mock('../services/githubSync',()=>({readRemotePriceHistory:vi.fn(),writeRemotePriceHistory:vi.fn()}))
it('preserves a second price arriving during an in-flight GitHub write',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
  localStorage.clear()
  const point=(id:string)=>snapshotsFromQuotes(id,collectMarketPriceQuotes({cardmarket:{trend:10}},'fr'))
  recordPriceSnapshots(point('Dracaufeu'))
  let remote: PriceSnapshot[]=[], finish:()=>void=()=>{}
  vi.mocked(readRemotePriceHistory).mockImplementation(async()=>({sha:'test',document:{schemaVersion:2,updatedAt:new Date().toISOString(),snapshots:remote}}))
  vi.mocked(writeRemotePriceHistory).mockImplementationOnce(async(_connection,snapshots)=>{
    await new Promise<void>(resolve=>{finish=resolve}); remote=snapshots
    return 'first'
  }).mockImplementation(async(_connection,snapshots)=>{remote=snapshots;return 'next'})
  const connection={owner:'test',repo:'test',token:'test'}
  function Harness(){useGitHubPriceHistorySync(connection);return null}
  const host=document.createElement('div'),root=createRoot(host)
  await act(async()=>root.render(createElement(Harness)))
  expect(writeRemotePriceHistory).toHaveBeenCalledTimes(1)
  await act(async()=>{recordPriceSnapshots(point('Magicarpe'));finish()})
  expect(getAllPriceHistory().map(row=>row.cardId).sort()).toEqual(['Dracaufeu','Magicarpe'])
  expect(remote.map(row=>row.cardId).sort()).toEqual(['Dracaufeu','Magicarpe'])
  act(()=>root.unmount())
})
