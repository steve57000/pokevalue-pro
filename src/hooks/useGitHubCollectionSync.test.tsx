// @vitest-environment jsdom
import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useGitHubCollectionSync, type GitHubCollectionSync } from './useGitHubCollectionSync'
import { emptyCollection, upsertEntry, type CollectionDocument } from '../domain/collection'
import { readRemotePortfolio, writeRemotePortfolio } from '../services/githubSync'
vi.mock('../services/githubSync',()=>({readRemotePortfolio:vi.fn(),writeRemotePortfolio:vi.fn()}))
it('merges a delayed remote collection without removing local cards or newer manual prices',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});localStorage.clear()
  localStorage.setItem('pv-github-connection-v1',JSON.stringify({owner:'test',repo:'test',token:'test'}))
  const card={source:'tcgdex' as const,setId:'30th-c',cardId:'30th-c-001',language:'fr',variant:'normal',name:'Dracaufeu',setName:'Classique',quantity:1,condition:'mint' as const,notes:'',manualPrice:150}
  const local=upsertEntry(emptyCollection(),card)
  const remote=upsertEntry(emptyCollection(),{...card,cardId:'30th-c-030',name:'Magicarpe',manualPrice:30})
  let finish:()=>void=()=>{}, document=local, sync:GitHubCollectionSync|undefined
  vi.mocked(readRemotePortfolio).mockImplementation(async()=>{await new Promise<void>(resolve=>{finish=resolve});return {login:'test',sha:'old',document:remote}})
  vi.mocked(writeRemotePortfolio).mockResolvedValue({content:{sha:'new'}})
  function Harness(){const [value,setValue]=useState(local);document=value;sync=useGitHubCollectionSync(value,setValue);return null}
  const host=window.document.createElement('div'),root=createRoot(host)
  await act(async()=>root.render(createElement(Harness)))
  await act(async()=>finish())
  expect(document.entries.map(row=>row.name).sort()).toEqual(['Dracaufeu','Magicarpe'])
  expect(document.entries.find(row=>row.name==='Dracaufeu')?.manualPrice).toBe(150)
  expect(writeRemotePortfolio).toHaveBeenCalled()
  expect(sync?.status).toBe('saved')
  act(()=>root.unmount())
})

it('sends market evidence, graded copies and personal sales to the private backup and retains them on reconnect',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});localStorage.clear();vi.clearAllMocks()
  localStorage.setItem('pv-github-connection-v1',JSON.stringify({owner:'test',repo:'private-backup',token:'test'}))
  const {migrateMarketObservations,addPersonalSales,changeListedFormat,saveGradingSettings}=await import('../domain/collectionExtras')
  let local=upsertEntry(emptyCollection(),{source:'tcgdex',setId:'me02',cardId:'me02-118',language:'fr',variant:'normal',name:'Méga-Kravarech-ex',setName:'Chaos Ascendant',quantity:2,condition:'near-mint',notes:''})
  local=migrateMarketObservations(local,[{id:'observation',cardKey:local.entries[0].key,company:'PCA',grade:'10',priceEur:115,soldAt:'2026-10-17',sourceUrl:'https://www.ebay.fr/itm/evidence',marketplace:'eBay'}])
  local=addPersonalSales(local,[{cardKey:local.entries[0].key,quantity:1}])
  local=changeListedFormat(local,local.personalSales![0].id,{company:'CCC',grade:'10 Gold Label',certificate:'test'})
  local=saveGradingSettings(local,{cardKey:local.entries[0].key,costs:{PCA:'25'},feePercent:'8'})
  let remote:CollectionDocument|undefined,live=local
  vi.mocked(readRemotePortfolio).mockImplementation(async()=>({login:'test',sha:remote?'saved':undefined,document:remote}))
  vi.mocked(writeRemotePortfolio).mockImplementation(async(_,value)=>{remote=JSON.parse(JSON.stringify(value));return {content:{sha:'saved'}}})
  function Harness({initial}:{initial:CollectionDocument}){const [value,setValue]=useState(initial);live=value;useGitHubCollectionSync(value,setValue);return null}
  let root=createRoot(window.document.createElement('div'))
  await act(async()=>root.render(createElement(Harness,{initial:local})))
  expect(writeRemotePortfolio).toHaveBeenCalledWith(expect.objectContaining({repo:'private-backup'}),expect.objectContaining({marketObservations:expect.any(Array),personalSales:expect.any(Array),gradingSettings:expect.any(Array)}),undefined)
  expect(remote!.marketObservations![0].sourceUrl).toContain('/evidence')
  act(()=>root.unmount())
  root=createRoot(window.document.createElement('div'))
  await act(async()=>root.render(createElement(Harness,{initial:emptyCollection()})))
  expect(live.entries[0].gradedCopies![0].company).toBe('CCC')
  expect(live.marketObservations![0].priceEur).toBe(115)
  expect(live.personalSales![0].status).toBe('listed')
  expect(live.gradingSettings![0].feePercent).toBe('8')
  act(()=>root.unmount())
})
