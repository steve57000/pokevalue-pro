import type { StatsRow } from '../domain/collectionStats'
import { money } from '../utils/money'

export function IndicativeValueSummary({ rows }: { rows: StatsRow[] }) {
  const indicative = rows.filter(row => row.owned > 0 && row.value === undefined && row.indicative)
  if (!indicative.length) return null
  const total = indicative.reduce((sum, row) => sum + row.indicative!.value * row.owned, 0)
  const expired = indicative.filter(row => row.indicative!.identityVerified === true).length
  const unverified = indicative.length - expired
  const dates = indicative.map(row => (row.indicative!.sourceUpdatedAt ?? row.indicative!.date).slice(0, 10)).sort()
  const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR')
  return <aside className="indicative-summary" aria-label="Total indicatif séparé">
    <div><strong>Total indicatif séparé</strong><b>{money(total)}</b></div>
    <p>{indicative.length} références · {indicative.reduce((sum, row) => sum + row.owned, 0)} exemplaires{unverified > 0 ? ` · ${unverified} non vérifiées` : ''}{expired > 0 ? ` · ${expired} à actualiser` : ''}</p>
    <details><summary>À propos de cette estimation</summary>
      <p>Anciennes références Cardmarket du {date(dates[0])}{dates[0] !== dates[dates.length - 1] ? ` au ${date(dates[dates.length - 1])}` : ''}. {unverified > 0 && 'L’édition et la langue ne sont pas confirmées pour les références non vérifiées. '}{expired > 0 && 'Les relevés vérifiés à actualiser ont dépassé leur date de validité. '}Ces montants ne sont pas des cotes actuelles.</p>
      <p>Seules les cartes sans valeur personnelle ou cote vérifiée encore valide figurent ici. Ce total reste séparé de la valeur connue ; il ne déclenche aucune alerte et ne crée aucune courbe de prix vérifiés.</p>
    </details>
  </aside>
}
