# Navigation et feuille de route de PokéValue Pro

Dernière révision : 8 octobre 2026

## Principe de navigation

L’application doit répondre rapidement à quatre besoins : gérer les cartes possédées, découvrir le marché, comprendre la valeur dans le temps et retrouver les outils secondaires. Les destinations principales restent toujours visibles sur mobile ; les opérations ponctuelles restent dans « Plus ».

## Sitemap cible

- **Collection**
  - Parcourir une extension
  - Rechercher et filtrer les cartes
  - Afficher en cartes, liste ou grille
  - Modifier les quantités, favoris et détails d’une carte
- **Favoris**
  - Cartes et extensions suivies
- **Tendances**
  - Sélection de cartes à surveiller
  - Recherche marché : nom, numéro, extension et prix disponibles
  - Fiche carte et source du prix
- **Stats**
  - Valeur de la collection et progression
  - Répartition des cartes suivies, favoris et raretés
  - Historique, variation et filtres de prix
  - Comparaison des extensions
- **Plus**
  - Gradation
  - Estimation d’un lot
  - Guide d’achat
  - Sauvegarde et synchronisation

### Navigation par écran

- **Mobile, barre fixe :** Collection · Favoris · Tendances · Stats · Plus
- **Grand écran, menu latéral :** Mon espace (Collection, Favoris, Gradation) · Marché (Tendances, Stats) · Outils (Estimer un lot, Guide achat) · Données (Sauvegarde)

La recherche marché est un onglet de Tendances, et non une destination concurrente. Les anciens liens `#/scanner` ouvrent la recherche marché pour rester compatibles.

## Feuille de route

### Étape 1 — Clarifier les destinations et le mobile (livrée)
- Renommer « Cartes à surveiller » en « Tendances ».
- Regrouper la sélection et la recherche marché dans deux onglets de cette page.
- Renommer la page de suivi des prix en « Stats » et y rassembler les indicateurs du catalogue.
- Reclasser les entrées du menu selon leur fonction.
- Faire tenir les actions de la fiche carte dans la largeur d’un mobile, sans défilement horizontal.

### Étape 2 — Donner des repères fiables sur le marché
- Montrer clairement la source, la langue disponible et la date du relevé.
- Distinguer prix observé, estimation et prix saisi manuellement.
- Proposer des filtres de marché utiles : extension, fourchette de prix, variation et disponibilité des données.
- Signaler les recherches sans résultat et les erreurs de chargement avec une action pour réessayer.

### Étape 3 — Rendre les statistiques actionnables
- Prioriser valeur possédée, progression, évolution et cartes sans prix.
- Faire de chaque indicateur un raccourci vers la liste de cartes correspondante.
- Conserver les filtres et la position de lecture au retour vers la collection.
- Clarifier les limites des relevés et de l’historique selon la source.

### Étape 4 — Renforcer la sauvegarde et la qualité d’usage
- Vérifier la synchronisation durable et les conflits entre appareils.
- Garder une exportation exploitable comme solution de secours.
- Contrôler les parcours mobile, clavier, lecteur d’écran et préférence de mouvement réduit.
- Mesurer les temps d’affichage des catalogues et images avant toute optimisation ciblée.

## Règles de cohérence

- Une action principale par écran ; les actions secondaires sont groupées et nommées.
- Un même concept garde le même libellé dans le menu, le titre de page et les boutons.
- Les vues d’une carte ne mélangent pas données de collection et prix marché sans identifier leur provenance.
- Les pages accessibles par ancien lien restent redirigées vers leur destination actuelle.
