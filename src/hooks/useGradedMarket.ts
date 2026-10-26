import {useEffect,useState} from 'react'
import { EMPTY_GRADED_MARKET,mergeGradedMarket,parseGradedMarketFeed,type GradedMarketFeed } from '../domain/gradedMarket'

const STORAGE_KEY='pv-graded-market-cache-v1'
const TTL_MS=6*60*60*1000
export type GradedMarketStatus='loading'|'unconfigured'|'active'|'empty'|'cached'|'error'
type Snapshot={feed:GradedMarketFeed;status:GradedMarketStatus}
let feed:GradedMarketFeed=EMPTY_GRADED_MARKET
let status:GradedMarketStatus='loading'
let checkedAt=0
let loaded=false
let pending:Promise<void>|undefined
const listeners=new Set<()=>void>()
const snapshot=():Snapshot=>({feed,status})
function notify(){for(const listener of listeners)listener()}
function restore(){
 if(loaded)return
 loaded=true
 try{
  const saved=localStorage.getItem(STORAGE_KEY)
  if(saved){
   const candidate=parseGradedMarketFeed(JSON.parse(saved))
   if(candidate.status==='active'&&candidate.quotes.length){
    feed=candidate
    status='cached'
   }
  }
 }catch{/* Broken cache must not hide the public feed. */}
}
async function refresh(){
 restore()
 if(pending)return pending
 if(Date.now()-checkedAt<TTL_MS)return
 checkedAt=Date.now()
 pending=(async()=>{
  try{
   // Static artifact served by GitHub Pages. No private API credentials in the browser.
   const response=await fetch(import.meta.env.BASE_URL+'data/graded-market.json',{cache:'no-cache'})
   if(!response.ok)throw new Error('Flux gradation indisponible')
   const next=parseGradedMarketFeed(await response.json())
   if(next.status==='active'){
    feed=mergeGradedMarket(feed,next)
    status=feed.quotes.length?'active':'empty'
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(feed))}catch{/* Keep data in memory. */}
   }else{
    // An unconfigured or empty deployment must never erase a previous valid market snapshot.
    status=feed.quotes.length?'cached':'unconfigured'
   }
  }catch{
   status=feed.quotes.length?'cached':'error'
  }finally{notify()}
 })().finally(()=>{pending=undefined})
 return pending
}
export function useGradedMarket():Snapshot{
 const [value,setValue]=useState<Snapshot>(()=>{restore();return snapshot()})
 useEffect(()=>{
  const listener=()=>setValue(snapshot())
  listeners.add(listener)
  listener()
  void refresh()
  const onVisible=()=>{if(document.visibilityState==='visible')void refresh()}
  document.addEventListener('visibilitychange',onVisible)
  return()=>{listeners.delete(listener);document.removeEventListener('visibilitychange',onVisible)}
 },[])
 return value
}
