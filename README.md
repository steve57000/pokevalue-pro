# PokéValue Pro

Application web responsive pour identifier, comparer et organiser des cartes Pokémon. Le catalogue combine des sélections éditoriales avec les images et prix Cardmarket disponibles via TCGdex.

## Fonctionnalités

- catalogues français, anglais, japonais et chinois traditionnel, avec recherche par série et cases de possession ;
- sélection séparée de cartes à surveiller avec recherche et favoris ;
- 30 cartes du catalogue reliées à leurs identifiants TCGdex vérifiés ;
- images TCGdex, repli Pokémon TCG API et visuels des réimpressions Classic Collection du 30e anniversaire ;
- prix Cardmarket actualisés lorsqu’ils sont disponibles ;
- source, devise, date de mise à jour et état du cache affichés ;
- scanner mobile avec caméra arrière, aide au cadrage, contrôle de netteté et flash lorsqu’il est disponible ;
- reconnaissance manuelle ou continue par OCR, avec recherche automatique français + anglais ;
- second passage OCR agrandi et contrasté pour le petit numéro imprimé ;
- recherche croisée par nom, numéro et total de l’extension dans TCGdex ;
- comparaison perceptuelle locale de l’illustration pour départager les éditions d’un même Pokémon ;
- seuil de pertinence empêchant un résultat sans indice concordant d’être présenté comme correspondance ;
- confirmation visuelle obligatoire avant d’ajouter une carte à la collection ;
- import d’une photo comme solution de repli ;
- recherche assistée si l’OCR ne lit pas correctement une carte brillante ;
- historique des scans et collection conservés dans le navigateur ;
- application installable sur l’écran d’accueil ;
- modes clair et sombre.
- classeur par impression avec progression, filtres possédées/manquantes et quantités ;
- sauvegarde chiffrée en transit vers un dépôt GitHub privé, avec vérification du compte et du SHA ;
- export/import JSON pour récupération hors ligne.

## Classeur et modèle de données

La page **Ma collection** classe toutes les cartes françaises par famille et extension (notamment Méga-Évolution : Chaos Ascendant, Nuit Noire, 30e Anniversaire et Collection Classique). Aucune carte n’est cochée au départ. Le prix Cardmarket est indicatif, un prix manuel peut être saisi pour chaque carte possédée ; un lien lance une recherche Cardmarket à confirmer. La page **Ma collection** est le classeur. Le bouton « Je possède » ajoute l'impression exacte ;
la recherche et le scanner réutilisent le même identifiant TCGdex et demandent toujours une
confirmation. Une impression est identifiée par `source`, `setId`, `cardId`, `language` et
`variant` — jamais par son seul nom ou numéro. Le document local versionné est conservé dans
`localStorage` et reste disponible hors ligne. Voir [`docs/data-sources.md`](docs/data-sources.md)
pour les sources, limites de prix et vérifications de séries.

### Créer la sauvegarde GitHub à accès minimal

1. Sur GitHub, créer un **nouveau dépôt privé dédié**, par exemple `pokemon-collection-data`. Ne
   pas utiliser le dépôt public du site.
2. Ouvrir **Settings → Developer settings → Personal access tokens → Fine-grained tokens** puis
   **Generate new token**.
3. Choisir son compte comme resource owner, **Only select repositories**, puis sélectionner
   uniquement le dépôt privé créé à l'étape 1.
4. Dans **Repository permissions**, accorder seulement **Contents: Read and write**. Choisir une
   expiration courte et créer le jeton.
5. Dans l'interface **Ma collection**, saisir le propriétaire, le nom du dépôt et le jeton. Ne jamais
   le coller dans une issue, un chat, une URL ou le dépôt de code. Par défaut le jeton reste en mémoire. L’option « Rester connecté » le conserve
   dans le stockage de ce navigateur ; ne pas l’activer sur un appareil partagé.
6. Cliquer **Vérifier et charger** : l'application affiche le compte GitHub réellement authentifié
   et charge `collection/v1/portfolio.json` s'il existe. Cliquer ensuite **Sauvegarder**.

La sauvegarde fournit le SHA courant lors d'une mise à jour, ce qui empêche un écrasement
silencieux. En cas de changement concurrent, l'état **Conflit** demande de recharger et fusionner.
Les états **Local**, **En attente** et **Synchronisé** indiquent clairement la situation. Un jeton
révoqué/expiré ou une panne réseau n'efface pas la copie locale. **Export JSON** permet une copie
de récupération ; **Import JSON** restaure un document versionné.

### Retrouver la collection sur un autre navigateur

1. Ouvrir le site sur le nouvel appareil et aller dans **Ma collection**.
2. Saisir les trois informations GitHub dans l'interface (jamais dans la conversation).
3. Cliquer **Vérifier et charger** avant toute modification locale.
4. Vérifier le compte affiché et les cartes restaurées, effectuer les changements, puis sauvegarder.

## Fonctionnement du scanner

1. Le navigateur demande explicitement l’autorisation d’utiliser la caméra.
2. La carte est cadrée et capturée localement.
3. Tesseract.js lit le nom, puis effectue un passage renforcé sur le petit numéro.
4. Les indices textuels servent à rechercher des cartes dans les catalogues TCGdex français et anglais.
5. Le navigateur télécharge uniquement les images des candidates et compare localement leur empreinte visuelle à la photo.
6. Les résultats sans preuve concordante sont supprimés ; le badge « Meilleure correspondance » n’apparaît que si le premier résultat se détache réellement.
7. L’utilisateur confirme toujours visuellement la langue, l’extension, le numéro et l’illustration.

La photo n’est ni enregistrée dans `localStorage`, ni envoyée à TCGdex, ni commitée dans le dépôt. La comparaison d’image s’exécute dans le navigateur avec une petite empreinte de luminance et de couleur ; seule la photo locale est lue. Le worker Tesseract.js est livré avec l’application ; le cœur WebAssembly et le modèle de langue sont chargés à la première analyse puis mis en cache par le navigateur.

## Limites importantes

- Le scanner aide à identifier une carte ; il ne certifie ni son authenticité, ni son état, ni sa variante holo/reverse.
- Une carte sous sleeve brillante, floue, inclinée ou partiellement masquée peut produire plusieurs résultats.
- Le numéro imprimé reste le meilleur indice. L’utilisateur doit toujours confirmer l’extension, le numéro, la langue et l’illustration.
- L’indice sur 100 classe les correspondances ; il ne représente pas une probabilité statistique d’authenticité.
- Si la comparaison visuelle est bloquée par le navigateur ou le réseau, l’application conserve l’OCR et la confirmation manuelle sans inventer de correspondance.
- Les prix TCGdex/Cardmarket sont des indicateurs de marché, pas des ventes garanties.
- Les prix gradés ne sont pas présentés comme des données live lorsqu’aucune source spécialisée ne les fournit.
- Le premier OCR peut être plus lent, car le modèle de langue doit être téléchargé.
- Les quelques images absentes de TCGdex utilisent un visuel anglais de secours fourni par Pokémon TCG API.

## Compatibilité caméra

`navigator.mediaDevices.getUserMedia()` nécessite :

- un navigateur mobile récent ;
- une page servie en HTTPS, ou `localhost` pendant le développement ;
- l’autorisation caméra de l’utilisateur.

Si l’accès direct échoue, le bouton **Prendre ou importer une photo** utilise le sélecteur natif du téléphone.

## Installation

Prérequis : Node.js 22 recommandé.

```bash
npm ci
npm run dev
```

Ouvrir ensuite `http://localhost:5173`.

## Contrôles qualité

```bash
npm run typecheck
npm run test
npm run build
npm run check
```

La CI exécute l’installation propre, le typecheck, les tests et le build sur chaque pull request. Après fusion dans `main`, le même workflow prépare puis déploie `dist` sur GitHub Pages.

Le contrôle `npm run check` vérifie aussi que l’artefact contient la page principale, le manifeste, l’icône et des chemins relatifs compatibles avec l’adresse `/pokevalue-pro/`.

Pour le premier déploiement, sélectionner **GitHub Actions** dans `Settings > Pages > Build and deployment > Source`. Le workflow peut ensuite être relancé manuellement depuis l’onglet **Actions** grâce au déclencheur `workflow_dispatch`.

## Sources et dépendances principales

- [TCGdex](https://tcgdex.dev/) : catalogue, images et données de marché disponibles ;
- [Pokémon TCG API](https://docs.pokemontcg.io/) : images de secours lorsque TCGdex ne possède pas de scan ;
- [Tesseract.js](https://github.com/naptha/tesseract.js) : OCR local dans le navigateur ;
- API Web `MediaDevices.getUserMedia()` : accès caméra avec autorisation.

## Structure principale

```text
src/
  api/          client et recherche TCGdex
  components/   catalogue, prix, images et scanner
  domain/       types, prix et classement des correspondances
  hooks/        chargement des cartes live
  services/     worker OCR
  utils/        cache, caméra, dates, monnaie et stockage local
```

PokéValue Pro est un projet indépendant, non affilié à Nintendo, Creatures, Game Freak ou The Pokémon Company.
