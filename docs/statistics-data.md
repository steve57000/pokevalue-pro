# Données des statistiques

La collection définit les cartes possédées (identité, langue, édition, variante, quantité).
Une réponse de prix ne crée ni ne supprime une carte. Les prix personnels suivent le
mode choisi dans l’éditeur ; un prix personnel égal à zéro est valide.

## Persistance locale

Les relevés migrent de `price-history-v1` dans localStorage vers IndexedDB
`pokevalue-prices`, store `history`. La copie précédente est supprimée uniquement
après validation de la transaction complète. Aucun backend ou compte n’est ajouté.

Les écritures IndexedDB fusionnent dans une transaction lecture/écriture, y compris
entre onglets. Les relevés reçus pendant une ouverture ou une sauvegarde restent
dans la copie mémoire puis sont enregistrés. Une erreur conserve la copie précédente,
signale l’échec dans Stats et permet l’export depuis Sauvegarde. Aucun traitement
de quota ne coupe arbitrairement les relevés à 500 ou 100 lignes.

L’historique de courbe garde un budget de 20 000 points, tout en conservant au moins
la dernière référence de chaque identité de prix. Le stockage reste local au navigateur :
effacer ses données peut le supprimer. L’export JSON et la synchronisation GitHub
privée existante permettent une sauvegarde indépendante.

## Synchronisation

La collection distante est fusionnée avec la collection locale selon la date de
modification de chaque entrée, suppressions comprises. Une connexion n’écrase plus
l’ensemble local. Les réponses d’une connexion abandonnée sont ignorées.

L’historique distant est fusionné avec l’état courant après chaque attente réseau.
Une écriture distante achevée ne peut remplacer des prix reçus entre-temps.

## Évolution et couverture

Les valeurs et courbes utilisent des guides Cardmarket Europe EUR compatibles.
Les références d’un produit remappé ne sont pas reliées dans une même évolution.
Les moyennes de ventes 1/7/30 jours sont affichées séparément ; à défaut de deux jours
de relevés, la liste peut comparer explicitement la moyenne 7 jours à celle de 30 jours.
Ces moyennes ne deviennent pas des observations historiques inventées.

Une carte sans prix reste comptée, accessible par recherche et pagination, et ne
contribue pas à la valeur connue. Les données déjà supprimées par une ancienne version
ne peuvent être reconstituées sans historique exporté ou copie distante.

## Régressions couvertes

- Migration et rechargement de 800 références et de plusieurs dates.
- Prix arrivant pendant la migration et pendant une écriture GitHub.
- Écritures concurrentes de deux onglets.
- Conservation d’un prix personnel et de la valorisation via les vrais hooks React.
- Fusion d’une collection distante sans disparition des cartes locales.
- Navigation au-delà de 50 cartes, sélection et détail cohérents.
- Logo lent, échec réel de source et logo déjà chargé en cache.
