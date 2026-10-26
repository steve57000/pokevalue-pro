import {useEffect,useState} from 'react'
import { EMPTY_GRADED_MARKET,mergeGradedMarket,parseGradedMarketFeed,type GradedMarketFeed } from '../domain/gradedMarket'

const STORAGE_KEY='pv-graded-market-cache-v1'
const TTL_MS=6*60*60*1000
let feed:GradedMarketFeed=EMPTY_GRADED_MARKET
let checkedAt=0
let loaded=false
let pending:Promise<void>|undefined
const listeners=new Set<()=>void>()
function notify(){for(const listener of listeners)listener()}
function restore(){
 if(loaded)return
 loaded=true
 try{
  const saved=localStorage.getItem(STORAGE_KEY)
  if(saved)feed=parseGradedMarketFeed(JSON.parse(saved))
 }catch{/* Invalid local cache: keep public data as authoritative. */}
}
async function refresh(){
 restore()
 if(pending)return pending
 if(Date.now()-checkedAt<TTL_MS)return
 checkedAt=Date.now()
 pending=(async()=>{
  try{
   // Deployed artifact is static, generated outside the browser. Never send API secrets from a client.
   const response=await fetch(import.meta.env.BASE_URL+'data/graded-market.json',{cache:'no-cache'})
   if(!response.ok)throw new Error('Flux gradation indisponible.')
   const next=parseGradedMarketFeed(await response.json())
   if(next.status==='active'){
    feed=mergeGradedMarket(feed,next)
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(feed))}catch{/* The fetched feed remains available in memory. */}
    notify()
   }
  }catch{/* Preserve last known observations on outages or malformed updates. */}
 })().finally(()=>{pending=undefined})
 return pending
}
export function useGradedMarket(){
 const [value,setValue]=useState<GradedMarketFeed>(()=>{restore();return feed})
 useEffect(()=>{
  const handler=()=>setValue(feed)
  listeners.add(handler)
  handler()
  void refresh()
  const onVisible=()=>{if(document.visibilityState==='visible')void refresh()}
  document.addEventListener('visibilitychange',onVisible)
  return()=>{listeners.delete(handler);document.removeEventListener('visibilitychange',onVisible)}
 },[])
 return value
}
