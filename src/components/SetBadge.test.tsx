// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { SetBadge } from './SetBadge'
it('accepts a slow first load, changes source on actual failure and handles a cached image after metadata changes',()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
  vi.useFakeTimers()
  const host=document.createElement('div'), root=createRoot(host)
  const props={name:'30 ans',sources:['/logo.png','/fallback.png'],imageClass:'logo',fallbackClass:'fallback',eager:true}
  act(()=>root.render(createElement(SetBadge,props)))
  act(()=>vi.advanceTimersByTime(20000))
  expect(host.querySelector('img')?.getAttribute('src')).toBe('/logo.png')
  act(()=>host.querySelector('img')!.dispatchEvent(new Event('error')))
  expect(host.querySelector('img')?.getAttribute('src')).toBe('/fallback.png')
  act(()=>host.querySelector('img')!.dispatchEvent(new Event('load')))
  expect(host.querySelector('[role=status]')).toBeNull()
  const complete=vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true)
  const width=vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(200)
  act(()=>root.render(createElement(SetBadge,{...props,sources:['/cached.png']})))
  expect(host.querySelector('[role=status]')).toBeNull()
  expect(host.querySelector('img')?.getAttribute('loading')).toBe('eager')
  act(()=>root.unmount()); complete.mockRestore(); width.mockRestore();vi.useRealTimers()
})
