import {useMemo,useState} from 'react'
import {ArrowUpRight,BarChart3} from 'lucide-react'
import type {CollectionEntry} from '../domain/collection'
import {gradedMarketForCard,quoteFreshness,type GradedMarketFeed,type GradedMarketQuote} from '../domain/gradedMarket'
import {money} from '../utils/money'
type Props={entry:CollectionEntry;feed:GradedMarketFeed}
const day=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString('fr-FR')
const num=(value:number|undefined)=>value===undefined?'—':money(value)
function History({quote}:{quote:GradedMarketQuote}){
 const points=quote.history
 if(!points.length)return <p className="grading-comparison-empty">Pas encore de points de ventes datés pour cette combinaison.</p>
 const min=Math.min(...points.map(p=>p.averageEur)),max=Math.max(...points.map(p=>p.averageEur))
 const low=min===max?min*.95:min,high=max===min?max*1.05:max
 const last=points[points.length-1]!
 const start=Date.parse(points[0].date),end=Date.parse(last.date)
 const x=(date:string)=>36+((Date.parse(date)-start)/(end-start||1))*524
 const y=(price:number)=>160-(price-low)/(high-low||1)*124
 const coordinates=points.map(p=>x(p.date)+','+y(p.averageEur)).join(' ')
 return <div className="grading-market-chart">
  <svg viewBox="0 0 600 190" role="img" aria-label={'Historique daté des ventes '+quote.company+' '+quote.grade} preserveAspectRatio="xMidYMid meet">
   <line x1="36" x2="560" y1="160" y2="160" stroke="currentColor" opacity=".2"/>
   <line x1="36" x2="560" y1="36" y2="36" stroke="currentColor" opacity=".1"/>
   {points.length>1&&<polyline fill="none" stroke="var(--brand)" strokeWidth="2" points={coordinates}/>}
   {points.map(p=><circle key={p.date} cx={x(p.date)} cy={y(p.averageEur)} r="4" fill="var(--brand)"><title>{day(p.date)} · {money(p.averageEur)} · {p.count} vente(s)</title></circle>)}
   <text x="32" y="28" fontSize="11" fill="currentColor">{money(high)}</text>
   <text x="32" y="178" fontSize="11" fill="currentColor">{day(points[0].date)}</text>
   <text x="560" y="178" fontSize="11" fill="currentColor" textAnchor="end">{day(last.date)}</text>
  </svg>
  <small>{points.length} jour{points.length>1?'s':''} avec ventes observées · dernier relevé {day(last.date)} · {money(last.averageEur)} (moyenne pondérée, {last.count} vente{last.count>1?'s':''})</small>
 </div>
}
export function GradedMarketComparison({entry,feed}:Props){
 const quotes=useMemo(()=>gradedMarketForCard(feed,entry.key).sort((a,b)=>a.company.localeCompare(b.company)||b.grade.localeCompare(a.grade)),[entry.key,feed])
 const [selected,setSelected]=useState('')
 const active=quotes.find(q=>[q.company,q.grade,q.finish].join('|')===selected)??quotes[0]
 if(!quotes.length)return <div className="grading-market-panel"><h5><BarChart3 size={16}/> Données automatiques</h5><p>{feed.status==='unconfigured'?'Source de ventes gradées non activée : aucun prix gradé automatique n’est disponible pour le moment.':'Aucune observation automatique confirmée pour cette impression.'} Les ventes saisies manuellement restent disponibles dans le tableau ci-dessous.</p></div>
 return <section className="grading-market-panel" aria-label="Prix gradés externes">
  <header><div><h5><BarChart3 size={16}/> Cotes de ventes réalisées · CardStand</h5><p>Prix eBay agrégés par la source, séparés des ventes saisies manuellement. Les médianes sur 30 jours ne sont pas des ventes individuelles.</p></div><a href="https://cardstand.app/fr/developers" target="_blank" rel="noopener noreferrer">Méthode <ArrowUpRight size={13}/></a></header>
  <div className="grading-table-scroll"><table className="grading-comparison-table"><thead><tr><th>Société / note</th><th>Médiane 30j</th><th>Ventes 30j</th><th>Ventes 90j</th><th>Min–max 90j</th><th>Relevé</th></tr></thead><tbody>
   {quotes.map(quote=><tr key={[quote.company,quote.grade,quote.finish].join('|')}>
    <th scope="row">{quote.company}<small>{quote.grade} · {quote.finish}</small></th>
    <td><strong>{num(quote.median30)}</strong></td><td>{quote.count30??'—'}</td><td>{quote.count90??'—'}</td>
    <td>{quote.low90!==undefined&&quote.high90!==undefined?money(quote.low90)+' – '+money(quote.high90):'—'}</td>
    <td>{new Date(quote.fetchedAt).toLocaleDateString('fr-FR')}{quoteFreshness(quote)==='stale'&&<small className="grading-low-sample">Ancienne donnée</small>}</td>
   </tr>)}
  </tbody></table></div>
  <div className="grading-market-history">
   <label>Évolution par note<select value={[active.company,active.grade,active.finish].join('|')} onChange={event=>setSelected(event.target.value)}>{quotes.map(quote=><option key={[quote.company,quote.grade,quote.finish].join('|')} value={[quote.company,quote.grade,quote.finish].join('|')}>{quote.company} {quote.grade} · {quote.finish}</option>)}</select></label>
   <History quote={active}/>
  </div>
  <p className="grading-comparison-footnote">Historique : seulement les jours où des ventes ont été observées, sans remplissage artificiel. Les prix convertis en EUR et les médianes de la source sont indicatifs ; vérifier les comparables exacts et leur fraîcheur.</p>
 </section>
}
