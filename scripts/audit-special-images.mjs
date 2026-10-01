import {access,readFile} from 'node:fs/promises'
const source=await readFile(new URL('../src/data/cardImageOverrides.ts',import.meta.url),'utf8')
const records=[...source.matchAll(/cardId:'(30th-c-\d{3})'.*?localPath:`\$\{import\.meta\.env\.BASE_URL\}([^`]+)`.+?verified:true/g)].map(match=>({id:match[1],path:match[2]}))
const missing=[]
for(const record of records){try{await access(new URL(`../public/${record.path}`,import.meta.url))}catch{missing.push(record.id)}}
console.log(`30th-c : ${records.length} cartes · ${records.length-missing.length} visuels résolus · ${missing.length} placeholder`)
if(records.length!==30||missing.length){console.error(`Visuels absents: ${missing.join(', ')}`);process.exitCode=1}
