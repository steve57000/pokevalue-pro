# Flux des ventes gradées — état et conditions d’activation (octobre 2026)

> **Décision actuelle : consultation externe gratuite uniquement.** Chaque carte propose des recherches eBay *vendues et terminées* distinctes par société de gradation et note exacte (France / international), ainsi qu'une recherche PriceCharting pour consulter les guides et historiques disponibles. Ce sont des liens vers des **résultats à vérifier**, jamais des observations validées et enregistrées dans PokeValue Pro. Aucun backend, abonnement, clé ou scraping n'est activé. La saisie manuelle sourcée reste facultative. Le reste du document décrit une étude d'architecture reportée.


> **État vérifié le 26 octobre 2026 : source non connectée.** Le fichier `public/data/graded-market.json` contient `status: "unconfigured"` et zéro cote. Il n'y a actuellement **aucun prix gradé automatique dans le site**. Le lecteur de données et le cache sont prêts, mais ils n'interrogent aucun fournisseur ; les liens eBay ne remplissent pas les tableaux.
>
> **Licence CardStand :** les [conditions de son API](https://www.cardstand.app/developers/terms) interdisent notamment la constitution d'une base de prix concurrente et limitent le cache. PokeValue Pro étant un catalogue public avec statistiques de prix, **ne pas activer CardStand sans accord explicite couvrant cet usage.**
>
> **Autre fournisseur à étudier :** [PokemonPriceTracker](https://www.pokemonpricetracker.com/licensing) autorise des outils de collection non commerciaux sur le plan gratuit et demande le plan Business pour un usage commercial. Sa couverture PSA/CGC/BGS/SGC ne garantit pas CCC, PCA ou CollectAura. Une clé privée, un rapprochement strict des cartes et la licence adaptée restent nécessaires.


## État du projet

- **Lecteur installé** : `src/hooks/useGradedMarket.ts` lit un artefact statique à `data/graded-market.json`, conserve le dernier flux correct en cache local et évite tout secret dans le navigateur.
- **Modèle/contrôle installés** : `src/domain/gradedMarket.ts` vérifie les identifiants de carte, les sociétés, les notes exactes, les dates, les montants en EUR et l'unicité.
- **Comparateur installé** : synthèses externes distinctes des observations manuelles, historique des jours de ventes réelles, signalement d'une donnée ancienne.
- **Connexion CardStand NON activée** : l'artefact actuel est volontairement `status: "unconfigured"`, donc aucune vente fictive.
- **Aucun backend payant, secret, scraping ou plan facturé créé**.

## Source sélectionnée

**CardStand (étude technique uniquement ; activation soumise à autorisation)** : `https://cardstand.app/fr/developers`.

Endpoints identifiés dans la documentation :

- `GET /games/pokemon/cards?q=...` puis validation *exacte* du nom, de l'extension, du numéro imprimé, de la langue et de la variante (ou du `external_id` lorsque l'identité est garantie) pour obtenir l'UUID fournisseur.
- `GET /cards/{id}` : `graded[]` contient la société de certification, sa note, sa finition, des agrégats 30/90j, leurs nombres et l'origine `ebay` ; c'est le premier endpoint à utiliser pour maîtriser les quotas.
- `GET /cards/{id}/sales` : transactions individuelles datées, à utiliser pour le contrôle qualité et la traçabilité, si autorisées par la licence.
- `GET /cards/{id}/graded-prices` : points d'historique par jour de vente. Un jour sans vente doit rester *absent* du graphique : pas d'interpolation synthétique.

Les 100 appels mensuels et 10/min du forfait gratuit imposent une sélection limitée de cartes prioritaires. Exemple de budget à confirmer : 12 cartes × 4 actualisations mensuelles = 48 appels de détails, laissant 52 appels pour la résolution d'identités, les diagnostics et les historiques ciblés. Ne pas exécuter un balayage global de catalogue.

**Important** : les détails des champs et la présence de CCC/CollectAura ne sont pas validés sur des réponses API authentifiées : tester plusieurs cartes réelles avant de coder le normaliseur de production. Les sociétés ou les notes non reconnues sont ignorées, jamais converties vers PSA 10 par défaut.

## Architecture d'activation envisagée — uniquement avec un fournisseur autorisé

1. Choisir un fournisseur autorisant l'usage prévu et obtenir une clé API personnelle et privée.
2. Stocker la clé dans un **GitHub Actions Secret** propre au fournisseur, jamais dans Vite, le JSON public ni les logs.
3. Dans une **GitHub Action planifiée**, limiter les appels et sélectionner uniquement une **liste publique de cartes suivies** (sans exporter la collection privée ni les quantités possédées). Résoudre les identifiants fournisseur et vérifier la correspondance de chaque impression. Rejeter tout résultat ambigu.
4. Transformer une réponse authentique vers le format `GradedMarketFeed` décrit par `src/domain/gradedMarket.ts` ; séparer *médiane* (agrégat) de *moyenne journalière pondérée* (historique) et de *vente unitaire*.
5. Conserver les points de vente dans un **fichier versionné** ou un stockage persistant sous contrat. Le cache temporaire GitHub Actions n'est pas l'historique permanent. Ne jamais écraser l'historique valide sur 429, timeout ou réponse invalide.
6. Déployer uniquement les agrégats dont la réutilisation publique a été autorisée, sous forme de JSON, en même temps que GitHub Pages via le workflow de build, et fournir des métadonnées d'observation explicites (date, source, calcul, fenêtre, nombre de ventes).
7. Le navigateur recharge au plus une fois toutes les six heures, préserve le dernier flux valide et affiche « ancien » si la collecte date de plus de sept jours. La sauvegarde de collection et les ventes manuelles restent séparées.

## Qualité et tests d'acceptation

- Échantillon d'au moins 12 impressions dont FR, EN, JP et ZH-TW, et quelques variantes rares. Inclure les cas de catalogue introuvable, plusieurs impressions à noms identiques et finitions différentes.
- Comparer les ventes d'au moins un PSA 9, PSA 10, BGS 10/Black Label, CGC Pristine, et, **si couvertes**, CCC Gold/Black et CollectAura Perfect/Gem Mint. Une catégorie absente reste non disponible.
- Exiger **aucune association approximative** de la langue, variante, première édition, édition limitée, numéro et société.
- Vérifier les liens vers la source, les ventes réelles, les périodes, les unités monétaires, la conversion EUR, les frais de port non compris et le faible échantillon.
- Contrôler le modèle sur un flux incomplet, des doublons, une panne réseau, 429 quota atteint et une réponse périmée.
- Avant activation publique : contrôle du contrat de licence et tests `npm run check` sur la branche de production.

## Format de l'artefact statique

```json
{
  "schemaVersion": 1,
  "generatedAt": null,
  "status": "unconfigured",
  "quotes": []
}
```

Lorsqu'elle est activée, chaque `quote` possède `cardKey` (la clé exacte de collection), `provider: "cardstand"`, `company`, `grade`, `finish`, `currency: "EUR"`, `fetchedAt`, éventuellement `median30`, `count30`, `count90`, `low90`, `high90`, et `history: [{date,averageEur,count}]`. Les quantités et valeurs absentes ne doivent pas être remplacées par zéro.

## Alternative

Soldgraph (`https://soldgraph.com/pokemon-card-price-api`) peut vérifier des annonces conclues hors couverture CardStand ; les recherches libres présentent un risque d'association inexacte de note et d'impression. Ne pas intégrer les résultats sans contrôle de concordance strict.

_Le flux externe est volontairement inactif jusqu'à l'obtention de la clé, à la validation de l'accès aux données, et à la décision sur le traitement automatisé sécurisé._
