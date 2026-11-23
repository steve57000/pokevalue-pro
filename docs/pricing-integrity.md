# Prix par édition et langue — correction du 23 novembre 2026

## Incident confirmé

Les réponses TCGdex FR du 14 novembre associent `me06-084`, `me06-138` et
`me06-141` au même produit Cardmarket **918912**, avec une tendance de **4 €**
(mise à jour source du 13 novembre). Le contrôle du 8 novembre avait relevé
le même partage de produit à **5,69 €**. Ce montant ne permet pas d'estimer
l'illustration spéciale 138 ou l'hyper rare 141. La FAQ de TCGdex documente
ce problème d'association entre carte régulière et illustration spéciale :
https://tcgdex.dev/fr/faq .

Une réponse du catalogue `/fr/` n'établit pas non plus que le prix concerne
une carte physiquement française. Même règle pour EN, JA et ZH-TW.

## Relevés correctifs

`src/data/reviewedDeltaPrices.json` conserve les observations publiques de
https://manakodex.com/fr/sets/regne-delta consultées le 23 novembre 2026.
Les 140 identités retenues ont chacune un numéro exact, une URL de produit
Cardmarket portant ce numéro et deux observations **FR / EN distinctes**,
avec dates source et nombres d'offres. Les noms ont été comparés au catalogue
ME06 : seules des différences typographiques et de traduction ont été relevées.

Ce sont les **annonces les moins chères**, Near Mint ou mieux, hors port et
hors reverse, telles que relevées par Manakodex. Ce ne sont ni des ventes
conclues ni une cote temps réel. Cardmarket n'a pas permis la consultation
directe de ses pages (HTTP 403) ; la source de chaque observation reste donc
explicitement Manakodex. La consultation actuelle et l'historique du site
peuvent différer : le fichier utilise les observations actuelles datées,
sans reconstruire une moyenne ni importer les lignes historiques.

| Carte | FR | Date source FR | EN | Date source EN |
| --- | ---: | --- | ---: | --- |
| Méga-Rayquaza-ex 084 | 1,50 € | 18/11/2026 | 2,50 € | 21/11/2026 |
| Méga-Rayquaza-ex 138 | 430 € | 23/11/2026 | 245,81 € | 23/11/2026 |
| Méga-Rayquaza-ex 141 | 223 € | 16/11/2026 | 189 € | 18/11/2026 |
| Raikou-ex 136 | 149,99 € | 18/11/2026 | 66,81 € | 18/11/2026 |

Contrôles individuels supplémentaires :
- https://manakodex.com/fr/sets/regne-delta/138-mega-rayquaza-ex
- https://manakodex.com/fr/sets/regne-delta/141-mega-rayquaza-ex
- https://manakodex.com/fr/sets/regne-delta/136-raikou-ex
- https://manakodex.com/fr/sets/regne-delta/137-mega-golemastoc-ex

**Exclusion :** `me06-132` est absente des prix correctifs : l'URL publiée par
la source se termine en `Bubbly-W-Energy-DLR133`. La validation du numéro
rejette cette correspondance au lieu d'emprunter son prix.

## Règles de l'application

- Les observations contrôlées sont chargées immédiatement, même si TCGdex
  est indisponible. Aucun prix ne passe d'un numéro ou d'une langue à un autre.
- Les prix TCGdex sans preuve indépendante d'identité et de langue ne sont
  plus présentés comme une cote locale. Les références manquantes affichent
  « prix non vérifié » ; aucun prix FR n'est déduit d'un prix japonais.
- Les prix personnels, y compris zéro, restent prioritaires. Les observations
  NM servent uniquement aux copies NM / Mint de finition normale dans les
  totaux. Pas de valorisation automatique d'une reverse ou d'une Jumbo.
- Les annonces restent distinctes du guide et des moyennes de ventes. Elles
  ne servent pas à inventer un historique de cours ou une rentabilité de
  gradation. La date source est conservée lors des visites successives :
  ouvrir l'application plusieurs jours ne crée pas plusieurs prix nouveaux.
- Après 14 jours, une observation reste visible avec sa date et le libellé
  « à actualiser », mais ne contribue plus aux totaux ni aux alertes.
- Les anciens caches API sont invalidés (version 4). L'historique local et
  distant existant est conservé, mais ses prix sans preuve d'identité et de
  langue sont exclus des graphiques et totaux. Le schéma d'historique reste
  compatible avec la sauvegarde privée, y compris les nouveaux champs source.
- Les anciens déclenchements d'alerte restent visibles comme historiques à
  revérifier ; les nouveaux sont marqués explicitement comme vérifiés.

## Mise à jour et validation

Aucun serveur, abonnement, clé publique ni tâche automatique n'a été ajouté.
Pour mettre à jour ce relevé, télécharger la page publique ci-dessus, en
contrôler les données et passer le HTML à :

```sh
node scripts/import-delta-price-observations.mjs /chemin/regne-delta.html
npm run check
```

L'import valide l'ensemble de 141 identités, les domaines, les numéros dans
les liens, les montants et les dates ; il signale les lignes écartées. Le
fichier produit doit être relu avant publication, avec vérification des
pages individuelles des principales cartes. Les tests couvrent notamment
le partage erroné du produit 918912, FR/EN/JA/ZH-TW, l'expiration, les prix
personnels, les copies usées, la sauvegarde et l'absence de courbe fictive.
