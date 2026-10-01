// Rebuild the explicitly mapped special-set assets once; never runs in the browser.
import {mkdir,writeFile} from 'node:fs/promises'
const source=await (await import('node:fs/promises')).readFile(new URL('../src/data/cardImageOverrides.ts',import.meta.url),'utf8')
const records=[...source.matchAll(/cardId:'30th-c-(\d{3})'.*?syncSource:'([^']+)'/g)].map(match=>({number:match[1],url:match[2]}))
await mkdir(new URL('../public/card-images/30th-c/',import.meta.url),{recursive:true})
for(const record of records){const response=await fetch(record.url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`${record.number}: HTTP ${response.status}`);await writeFile(new URL(`../public/card-images/30th-c/${record.number}.png`,import.meta.url),Buffer.from(await response.arrayBuffer()));console.log(`✓ ${record.number}`)}
