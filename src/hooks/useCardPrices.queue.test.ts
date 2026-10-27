import {afterEach,describe,expect,it,vi} from 'vitest'
import {tcgDexProvider} from '../api/tcgdex'
import {refreshCardPrices} from './useCardPrices'
import type {ExternalCard} from '../domain/cards'

afterEach(()=>vi.restoreAllMocks())

describe('foreground pricing priorities',()=>{
 it('starts requests for the newly opened set ahead of unstarted older cards',async()=>{
  const started:string[]=[]
  const completions=new Map<string,()=>void>()
  vi.spyOn(tcgDexProvider,'getCard').mockImplementation((id,language='fr')=>new Promise<ExternalCard>(resolve=>{
   started.push(id)
   completions.set(id,()=>resolve({id,name:id,language}))
  }))
  const old=Array.from({length:10},(_,i)=>'queue-old-oct27-'+i)
  const current=['queue-visible-oct27-1','queue-visible-oct27-2']
  refreshCardPrices(old)
  expect(started).toEqual(old.slice(0,7))
  refreshCardPrices(current)
  completions.get(old[0])!()
  await new Promise<void>(resolve=>setTimeout(resolve,0))
  expect(started[7]).toBe(current[0])
  // Allow every mocked request to finish so the queue remains clean for other tests.
  const finished=new Set<string>()
  for(let pass=0;pass<20;pass++){
   const next=started.find(id=>!finished.has(id))
   if(!next)break
   finished.add(next)
   completions.get(next)?.()
   await new Promise<void>(resolve=>setTimeout(resolve,0))
  }
  expect(started).toHaveLength(old.length+current.length)
  expect(started.indexOf(current[1])).toBeLessThan(started.indexOf(old[7]))
 })
})
