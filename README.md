# PokéValue Pro

Application web responsive pour identifier, comparer et organiser des cartes Pokémon. Le catalogue combine des sélections éditoriales avec les images et prix Cardmarket disponibles via TCGdex.

## Fonctionnalités

- catalogue avec recherche, filtres, favoris et collection locale ;
- images réelles et prix Cardmarket actualisés pour les cartes reliées à TCGdex ;
- source, devise, date de mise à jour et état du cache affichés ;
- scanner mobile avec caméra arrière, aide au cadrage, contrôle de netteté et flash lorsqu’il est disponible ;
- reconnaissance manuelle ou continue par OCR français/anglais ;
- recherche des correspondances par nom et numéro dans TCGdex ;
- confirmation visuelle obligatoire avant d’ajouter une carte à la collection ;
- import d’une photo comme solution de repli ;
- recherche assistée si l’OCR ne lit pas correctement une carte brillante ;
- historique des scans et collection conservés dans le navigateur ;
- application installable sur l’écran d’accueil ;
- modes clair et sombre.

## Fonctionnement du scanner

1. Le navigateur demande explicitement l’autorisation d’utiliser la caméra.
2. La carte est cadrée et capturée localement.
3. Tesseract.js lit le nom et le numéro dans le navigateur.
4. Seuls ces indices textuels sont envoyés à TCGdex pour rechercher des cartes.
5. Les meilleures correspondances, images et prix disponibles sont affichés.
6. L’utilisateur confirme visuellement la bonne carte.

La photo n’est ni enregistrée dans `localStorage`, ni envoyée à TCGdex, ni commitée dans le dépôt. Les modèles OCR et le worker Tesseract.js sont chargés à la première analyse puis mis en cache par le navigateur.

## Limites importantes

- Le scanner aide à identifier une carte ; il ne certifie ni son authenticité, ni son état, ni sa variante holo/reverse.
- Une carte sous sleeve brillante, floue, inclinée ou partiellement masquée peut produire plusieurs résultats.
- Le numéro imprimé reste le meilleur indice. L’utilisateur doit toujours confirmer l’extension, le numéro, la langue et l’illustration.
- Les prix TCGdex/Cardmarket sont des indicateurs de marché, pas des ventes garanties.
- Les prix gradés ne sont pas présentés comme des données live lorsqu’aucune source spécialisée ne les fournit.
- Le premier OCR peut être plus lent, car le modèle de langue doit être téléchargé.

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
