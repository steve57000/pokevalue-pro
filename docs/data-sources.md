# Sources de données et décisions

_Vérification effectuée le 29 septembre 2026._

## TCGdex (source principale)

L'application consomme l'API REST v2 en français (`https://api.tcgdex.net/v2/fr`). La couche
`CardDataProvider` isole le domaine de ce fournisseur. L'identité enregistrée n'est jamais le nom
seul ou le numéro seul : `source + setId + cardId + langue + variante` sont nécessaires. Les noms,
numéros, raretés, images et éventuels prix restent attribués à la réponse source.

- Les images sont servies par TCGdex en WebP. Pokémon TCG API n'est utilisée que comme repli
  d'image pour quelques identifiants compatibles, avec attribution explicite.
- Les données Cardmarket exposées par TCGdex peuvent contenir `trend`, `avg`, `avg7`, `avg30` et
  `low`, en EUR, ainsi qu'une date de mise à jour. L'interface les décrit comme indicateurs agrégés,
  jamais comme prix garanti d'une carte française ou d'un état donné.
- Le client met les fiches en cache 24 heures, limite sa concurrence à six requêtes et réutilise le
  cache périmé en cas d'indisponibilité. Aucune actualisation serveur n'est ajoutée : sans contrat
  fournisseur garantissant la fréquence et les droits de redistribution, promettre une mise à jour
  quotidienne serait trompeur.
- Aucun scraping Cardmarket n'est effectué. Les conditions et licences doivent être revérifiées
  avant toute redistribution commerciale d'un cache de données ou d'images.

Documentation fournisseur : [TCGdex](https://tcgdex.dev/). Dépôt et licence du SDK/API :
[tcgdex/cards-database](https://github.com/tcgdex/cards-database). Documentation de l'API d'image
de secours : [Pokémon TCG API](https://docs.pokemontcg.io/).

## Séries prioritaires

Les libellés « 30e Anniversaire », « Nuit Noire » et « Chaos Ascendant » ne sont pas codés en dur
comme identifiants : ce sont des noms éditoriaux susceptibles de différer des noms de la base. Au
moment de cette livraison, l'environnement de build refuse l'accès sortant à l'API TCGdex (HTTP
403 au niveau du proxy) et le PDF annoncé n'était pas présent dans le dépôt. Une correspondance
fiable n'a donc pas pu être validée. **Aucun identifiant n'a été inventé.**

Pour valider une série, interroger `/v2/fr/sets`, ouvrir la fiche exacte, contrôler son `id`, sa date,
ses comptes `official` et `total`, puis vérifier plusieurs cartes via leur identifiant global. Une
série ne doit être déclarée complète qu'après comparaison des cartes principales, secrètes,
promotions et sous-ensembles fournis par la source. Le modèle accepte ces distinctions via
`setId`, `cardId` et `variant`; une variante inconnue reste `normal` jusqu'à confirmation humaine.

## Prix et valeur du portfolio

Une valeur n'est additionnée que lorsqu'un prix fournisseur valide existe pour l'impression.
Chaque affichage précise fournisseur, indicateur, devise et date. À défaut, l'application affiche
« prix indisponible » ou une estimation éditoriale clairement distincte. L'état, la langue, une
reverse/holo et la gradation peuvent changer le prix : un agrégat Cardmarket ne les garantit pas.

## GitHub

La sauvegarde emploie l'[API Contents GitHub](https://docs.github.com/rest/repos/contents) avec le
SHA du fichier. Le jeton n'est transmis qu'à `api.github.com` dans l'en-tête `Authorization`, n'est
ni journalisé ni placé dans une URL, et reste en mémoire. Le fichier cible est exclusivement
`collection/v1/portfolio.json` dans le dépôt choisi par l'utilisateur.

## Images et dos de carte
Le dos standard occidental est livré avec le site (`public/images/pokemon-card-back.jpg`), téléchargé depuis https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg. Illustration Pokémon, utilisée pour la visualisation des cartes.
La galerie essaie WebP puis PNG. Si le visuel français échoue ou manque, elle demande le même identifiant au catalogue anglais et affiche « Visuel anglais ». Si les deux sources n'ont aucun visuel, elle le signale explicitement.
`node scripts/audit-images.mjs` produit l'audit des métadonnées de toutes les extensions françaises ; ajouter `--check-urls` pour contrôler également chaque URL. Les requêtes échouées sont signalées comme non vérifiées dans `docs/image-audit.json`.
Le 29/09/2026, `30th` fournit 158 URLs d'image ; `30th-c` fournit 30 cartes sans image, en français comme en anglais. Les visuels ne sont pas inventés ni remplacés par une autre impression.

## Manifeste Collection Classique 30e

`30th-c` est un sous-ensemble dont TCGdex expose les 30 identités mais aucun asset, quelle que soit
la langue testée. PokéValue utilise donc un manifeste explicite, indexé par les identifiants
`30th-c-001` à `30th-c-030`, qui conserve pour chaque entrée le nom et le numéro historique
imprimé vérifiés. Aucun rapprochement par nom ou numéro approchant n'est permis.

Les futurs fichiers applicatifs vérifiés seront servis localement depuis `public/card-images/30th-c/`.
Le synchroniseur refuse désormais de reconstruire la série à partir des impressions historiques.
`npm run audit:images` exige 30 identités et contrôle strictement tout asset local déclaré.

### Correction d’intégrité des visuels `30th-c` (1er octobre 2026)

Les 30 SVG précédemment présents étaient des placeholders générés et avaient été attribués à tort à
Pokémon. Ils ont été supprimés. Les URL `pokemontcg.io` pointaient vers les impressions historiques,
pas vers les réimpressions 30e : le synchroniseur ne les utilise donc plus. Les API TCGdex française
et anglaise et le catalogue public accessible dans cet environnement ont été contrôlés, sans asset
exact redistribuable disponible. Le manifeste conserve les 30 identités et numéros imprimés, mais ne
déclare aucune image `verified` : l’interface affiche « Visuel temporairement indisponible » plutôt
que de tromper l’utilisateur. L’audit refuse les SVG, les fichiers de moins de 50 Ko et les doublons
SHA-256 dès qu’un asset local est déclaré. Une image ne pourra être ajoutée qu’après vérification de
l’impression 30e exacte et de sa source.

Les liens Cardmarket passent tous par `buildCardmarketUrl` : URL produit vérifiée en priorité, puis
identité courte du manifeste (nom anglais, numéro historique et code `30C`), enfin nom et numéro de
la carte sans injecter le nom éditorial de l’extension.
