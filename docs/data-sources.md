# Sources de données et décisions

_Vérification effectuée le 29 septembre 2026._

## TCGdex (source principale)

L'application consomme l'API REST v2 (`https://api.tcgdex.net/v2/{fr,en,ja,zh-tw}`) pour parcourir les
catalogues français, anglais, japonais et chinois traditionnel. La couche
`CardDataProvider` isole le domaine de ce fournisseur. L'identité enregistrée n'est jamais le nom
seul ou le numéro seul : `source + setId + cardId + langue + variante` sont nécessaires. Les noms,
numéros, raretés, images et éventuels prix restent attribués à la réponse source.

- Les images TCGdex utilisent des URL canoniques sans extension, servies en WebP ou PNG selon l’asset. Pokémon TCG API n'est utilisée que comme repli
  d'image pour quelques identifiants compatibles, avec attribution explicite.
- Les prix TCGdex couvrent Cardmarket Europe (EUR, quotidien) et TCGplayer Amérique du Nord (USD, horaire ou quotidien), pas les marchés locaux japonais/chinois. Cardmarket expose les indicateurs non-foil à plat (trend, avg7, avg30, low) et les prix holo via des clés à tiret (trend-holo, avg-holo, etc.). TCGplayer est imbriqué par finition (normal, holofoil, reverse-holofoil). L'application conserve ces variantes séparément.
- Une cotation Cardmarket reste une référence européenne non filtrée par langue. Pour le catalogue anglais, TCGplayer apparaît comme repère nord-américain séparé en USD; il n'est ni converti ni additionné à la valeur du portfolio en EUR. Pour les catalogues japonais et chinois, aucune cote locale n'est disponible; l'application ne présente pas une valeur européenne ou américaine comme prix asiatique.
- Le client met les fiches en cache 24 heures, limite sa concurrence à six requêtes et réutilise le
  cache périmé en cas d'indisponibilité. Aucune actualisation serveur n'est ajoutée : sans contrat
  fournisseur garantissant la fréquence et les droits de redistribution, promettre une mise à jour
  quotidienne serait trompeur.
- Aucun scraping Cardmarket n'est effectué. Les conditions et licences doivent être revérifiées
  avant toute redistribution commerciale d'un cache de données ou d'images.

Documentation fournisseur : [TCGdex](https://tcgdex.dev/). Dépôt et licence du SDK/API :
[tcgdex/cards-database](https://github.com/tcgdex/cards-database). Documentation de l'API d'image
de secours : [Pokémon TCG API](https://docs.pokemontcg.io/).

## Catalogues et visuels par langue

Chaque langue est un catalogue indépendant. L’identifiant de série ou d’extension peut différer
entre catalogues; l’application conserve donc la langue, le `setId` et le `cardId` choisis. Pour les
cartes et les extensions, elle utilise d’abord l’URL `image` ou `logo` renvoyée par ce catalogue.
Elle essaie les formats WebP et PNG sur cette même racine d’asset après un échec de chargement.

Les quelques correspondances de série anglaise sont une liste explicite d’alias de familles. En dehors
des correspondances limitées à un set précis et vérifiées, aucun préfixe d’extension, nom traduit,
numéro de carte ou logo d’une extension voisine ne sert à déduire un autre asset. Les images de série utilisent uniquement le champ de logo de la série; les
symboles d’extension ne sont pas présentés comme des logos. Les replis anglais de logos et
d’extensions exigent le même identifiant exact, sans copier le logo d’une extension vers sa série.

Pour les cartes, le japonais et le chinois traditionnel essaient leur propre catalogue puis
l’anglais. Le japonais ne remplace jamais le chinois, ni l’inverse. Un visuel anglais n’est accepté
que pour le même `cardId` et porte l’indication « Visuel EN ». Quelques scans vérifiés et
correspondances de sous-extensions sont explicitement documentés dans le code. Si aucune source
exacte n’existe, l’interface affiche un repère au lieu d’inventer un chemin ou de montrer une autre
impression.

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
Chaque affichage précise fournisseur, marché, indicateur, devise et date quand la source les expose. Cardmarket Europe est le seul prix utilisé pour valoriser et additionner le portfolio, en EUR; sa langue n'est pas vérifiée. Le repère TCGplayer USD est réservé à l'affichage séparé du catalogue anglais. Les prix holo/reverse TCGplayer restent distincts des prix normaux. Aucun fournisseur de marché asiatique n'est branché : une vraie cote japonaise ou chinoise nécessite une source locale autorisée, un rapprochement fiable d'impression et un relais serveur si la clé n'est pas publique. À défaut, l'application indique que le prix local est indisponible.

## GitHub

La sauvegarde emploie l'[API Contents GitHub](https://docs.github.com/rest/repos/contents) avec le
SHA du fichier. Le jeton n'est transmis qu'à `api.github.com` dans l'en-tête `Authorization`, n'est
ni journalisé ni placé dans une URL, et reste en mémoire. Le fichier cible est exclusivement
`collection/v1/portfolio.json` dans le dépôt choisi par l'utilisateur.

## Images et dos de carte
Le dos standard occidental est livré avec le site (`public/images/pokemon-card-back.jpg`), téléchargé depuis https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg. Illustration Pokémon, utilisée pour la visualisation des cartes.
La galerie essaie les variantes WebP/PNG sur la racine fournie par le catalogue actif. Pour les langues non anglaises, une source d’une autre langue n’est utilisée qu’avec une correspondance exacte de `cardId`, puis indiquée par un badge de langue. Les exceptions locales et les correspondances explicites de sous-extensions restent limitées aux identifiants documentés. Les catalogues japonais et chinois ne se remplacent jamais l’un l’autre.
Pour la sous-série `30th-c`, TCGdex ne fournit pas de scan exact. L’application ne réutilise ni les images d’anciennes impressions ni les correspondances par nom; elle affiche un visuel indisponible jusqu’à ce qu’un scan vérifiable de la réimpression soit disponible.
`node scripts/audit-images.mjs` produit l'audit des métadonnées de toutes les extensions françaises ; ajouter `--check-urls` pour contrôler également chaque URL. Les requêtes échouées sont signalées comme non vérifiées dans `docs/image-audit.json`.
Au 29/09/2026, `30th` fournit 158 URLs d'image ; `30th-c` expose 30 identités sans scan exact dans TCGdex. L’application n’affiche pas les anciennes impressions comme substituts.

## Manifeste Collection Classique 30e

`30th-c` est un sous-ensemble dont TCGdex expose les 30 identités mais aucun asset, quelle que soit
la langue testée. PokéValue utilise donc un manifeste explicite, indexé par les identifiants
`30th-c-001` à `30th-c-030`, qui conserve pour chaque entrée le nom et le numéro historique
imprimé vérifiés. Aucun rapprochement par nom ou numéro approchant n'est permis.

Les futurs fichiers applicatifs vérifiés seront servis localement depuis `public/card-images/30th-c/`.
Le synchroniseur refuse désormais de reconstruire la série à partir des impressions historiques.
`npm run audit:images` exige les 30 identités et échoue si un scan d’une ancienne impression est déclaré pour `30th-c`.

### Correction d’intégrité des visuels `30th-c` (1er octobre 2026)

Les SVG placeholders et les URL d’anciennes impressions ne représentent pas les réimpressions 30e;
ils ne sont pas utilisés. TCGdex ne fournit pas de scan exact dans les catalogues testés. Le manifeste
conserve les 30 identités et leurs numéros imprimés, sans image déclarée comme vérifiée, et
l’interface affiche « Visuel temporairement indisponible ». L’audit confirme les 30 identités et
refuse toute carte historique présentée comme asset `30th-c`. Un scan ne pourra être ajouté
qu’après vérification de la réimpression exacte et de sa source.

Les liens Cardmarket passent tous par `buildCardmarketUrl` : URL produit vérifiée en priorité, puis
identité courte du manifeste (nom anglais, numéro historique et code `30C`), enfin nom et numéro de
la carte sans injecter le nom éditorial de l’extension.
