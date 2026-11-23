// Run after reviewing the downloaded Manakodex set page. No runtime scraping or credentials.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(process.cwd()+'/package.json');const {JSDOM}=require('jsdom');
if (!process.argv[2]) throw Error('Pass the path of the reviewed Manakodex HTML snapshot');
const document=new JSDOM(readFileSync(process.argv[2], 'utf8')).window.document;
const island=[...document.querySelectorAll('astro-island')].find(x=>x.getAttribute('component-url')?.includes('set-explorer'));
function decode([type,value]) {if(type===1)return value.map(decode);if(type===0&&value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decode(v)]));if(type===0)return value;throw Error('Unexpected encoding '+type)}
const props=JSON.parse(island.getAttribute('props'));const rows=decode(props.cards);
const identities=JSON.parse(readFileSync('src/data/deltaReignCards.json','utf8'));
const sourceUrl='https://manakodex.com/fr/sets/regne-delta';const capturedAt=new Date().toISOString();
const output={schemaVersion:1,setId:'me06',source:'cardmarket',aggregator:'manakodex',sourceUrl,capturedAt,basis:'listing',condition:'near-mint',variant:'normal',currency:'EUR',cards:[]};
if(rows.length!==141||new Set(rows.map(x=>x.localId)).size!==141)throw Error('Incomplete set');
for(const row of rows){const localId=String(row.localId).padStart(3,'0'),id='me06-'+localId;
 if(!identities.fr.some(x=>x.id===id)||!identities.en.some(x=>x.id===id))throw Error('Unknown card '+id);
 const url=new URL(row.cardmarketUrl);if(url.hostname!=='www.cardmarket.com'||!url.pathname.includes('/Delta-Reign/')||!url.pathname.endsWith('DLR'+localId)){console.log('REJECT',id,row.cardmarketUrl);continue;}
 const prices={};for(const [lang,suffix]of [['fr','Fr'],['en','En']]){const value=row['priceLow'+suffix],updatedAt=row['pricedAt'+suffix],offers=row['offerCount'+suffix];if(!(value>0)||!Number.isFinite(Date.parse(updatedAt))||Date.parse(updatedAt)>Date.parse(capturedAt)||offers<1)throw Error('Invalid quote '+id+':'+lang);prices[lang]={value,updatedAt,offers};}
 output.cards.push({id,number:localId,name:row.nameFr,rarity:row.rarity,marketUrl:row.cardmarketUrl,...prices});
}
output.cards.sort((a,b)=>a.id.localeCompare(b.id));
writeFileSync('src/data/reviewedDeltaPrices.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({count:output.cards.length,capturedAt,rejected:141-output.cards.length},null,2));
