// Validate the explicit English ME55C front-scan mapping; never infer scans from historic card numbers.
import {readFile} from 'node:fs/promises'

const source=await readFile(new URL('../src/data/cardImageOverrides.ts',import.meta.url),'utf8')
const mapBlock=source.match(/const classicCollectionCardIds\s*:\s*Record<string,string>\s*=\s*\{([\s\S]*?)\n\}/)
const scans=mapBlock?[...mapBlock[1].matchAll(/'(30th-c-\d{3})'\s*:\s*'(me55c-[\da-z]+)'/gi)]:[]
const expected=Array.from({length:30},(_,index)=>`30th-c-${String(index+1).padStart(3,'0')}`)
const errors=[]
if(scans.length!==30||new Set(scans.map(([,providerId])=>providerId)).size!==30)errors.push('La table doit contenir 30 scans ME55C uniques.')
if(!mapBlock||!expected.every(id=>mapBlock[1].includes(`'${id}'`)))errors.push('Chaque carte 30th-c doit avoir une correspondance explicite.')
if(!source.includes("https://images.pokemoncard.io/images/me55c/'+englishCardId+'.png"))errors.push('Le constructeur des scans PNG ME55C est absent.')
if(errors.length){errors.forEach(error=>console.error(error));process.exitCode=1}
else console.log('30 rectos anglais ME55C attribués par ID fournisseur explicite.')
