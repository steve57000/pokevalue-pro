# Fournisseurs de prix

## Couverture actuellement intégrée

TCGdex expose deux flux de marché distincts que PokéValue conserve séparés :

| Marché | Source | Devise | Usage dans PokéValue |
| --- | --- | --- | --- |
| Europe | Cardmarket via TCGdex | EUR | Référence du portfolio, toutes langues confondues |
| Amérique du Nord | TCGplayer via TCGdex | USD | Repère séparé affiché pour le catalogue anglais |
| Japon / Chine | Aucun fournisseur connecté | — | Prix local indiqué comme indisponible |

Les statistiques Cardmarket sont à plat pour le non-foil et utilisent des clés à tiret pour le holo. Les données TCGplayer sont imbriquées par finition (normal, holofoil, reverse-holofoil) et restent indépendantes les unes des autres. Une langue de catalogue ne suffit pas à prouver la langue d'un listing Cardmarket. Les devises ne sont pas converties ni additionnées ensemble.

## Vérification des options locales (13 octobre 2026)

- La v2 de JustTCG sait représenter plusieurs régions, mais sa [documentation](https://www.justtcg.com/docs/api/cards-v2) indique que seule l’Amérique du Nord renvoie actuellement des prix; les régions UK, UE et Japon restent en attente de données locales.
- pokemontcgapi.com référence bien une grande base japonaise et des lignes EUR/USD; sa [page de couverture](https://pokemontcgapi.com/coverage) indique toutefois qu’un échantillon de cartes chinoises simplifiées ne renvoie aucune ligne de prix. Cela ne constitue donc pas une couverture confirmée des cartes chinoises traditionnelles de PokéValue, ni un prix local japonais en JPY.
- Aucune source examinée ne permet, sans approximation, de remplir à la fois les prix locaux JP et ZH-TW demandés. Le choix d’un fournisseur doit attendre une vérification de la couverture exacte des impressions, des devises et des droits d’affichage.

## Ajouter une source de prix asiatique

Aucune API actuellement intégrée ne fournit une cote japonaise ou chinoise vérifiée. Une intégration n'est fiable que si elle précise le pays/marché, la devise, la langue et l'impression visée, ainsi que l'horodatage et les conditions de redistribution des données.

Avant développement, choisir un fournisseur et confirmer ses droits d'accès et de redistribution. Une intégration nécessitant une clé doit passer par un relais serveur (Cloudflare Worker, Vercel Function ou backend équivalent), avec la clé exclusivement côté serveur. Ne jamais ajouter une clé secrète dans une variable VITE_* : le bundle GitHub Pages est public. Ne pas scraper des marketplaces.

Le schéma reste ouvert aux fournisseurs via MarketPriceProvider; chaque nouveau prix devra inclure sa région et sa devise et ne sera pas mélangé à la valeur EUR sans conversion explicite, traçable et autorisée.
