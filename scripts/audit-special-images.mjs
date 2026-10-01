import {createHash} from 'node:crypto'
import {readFile,stat} from 'node:fs/promises'
import {extname} from 'node:path'
const manifest=await readFile(new URL('../src/data/cardImageOverrides.ts',import.meta.url),'utf8')
const identities=[...manifest.matchAll(/cardId:'(30th-c-\d{3})'/g)].map(match=>match[1])
const images=[...manifest.matchAll(/cardId:'(30th-c-\d{3})'[\s\S]*?image:\{localPath:`?\$?\{?[^}]*\}?([^'`,]+)[`']?,language:'([^']+)',source:'([^']+)',verified:true\}/g)]
const errors=[];const hashes=new Map()
if(identities.length!==30||new Set(identities).size!==30)errors.push(`Le manifeste doit contenir 30 identités uniques (reçu ${identities.length}).`)
for(const match of images){const [,id,path]=match,extension=extname(path).toLowerCase();if(!['.png','.webp','.jpg','.jpeg'].includes(extension))errors.push(`${id}: format ${extension||'absent'} interdit (SVG et placeholders refusés).`)
 try{const url=new URL(`../public/${path.replace(/^.*card-images\//,'card-images/')}`,import.meta.url),info=await stat(url),bytes=await readFile(url);if(info.size<50_000)errors.push(`${id}: fichier trop petit (${info.size} octets).`);const hash=createHash('sha256').update(bytes).digest('hex');if(hashes.has(hash))errors.push(`${id}: image identique à ${hashes.get(hash)}.`);hashes.set(hash,id)}catch{errors.push(`${id}: fichier local absent.`)}}
const unavailable=identities.length-images.length
console.log(`30th-c : ${identities.length} cartes · ${images.length} visuels exacts vérifiés · ${unavailable} visuels temporairement indisponibles · 0 faux placeholder`)
if(images.length!==30)console.warn(`Images exactes encore absentes: ${identities.filter(id=>!images.some(match=>match[1]===id)).join(', ')}`)
if(errors.length){for(const error of errors)console.error(error);process.exitCode=1}
