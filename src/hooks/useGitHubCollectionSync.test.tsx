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
