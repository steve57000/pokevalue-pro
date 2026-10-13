# Fournisseurs de prix

## Couverture actuellement intégrée

TCGdex expose deux flux de marché distincts que PokéValue conserve séparés :

| Marché | Source | Devise | Usage dans PokéValue |
| --- | --- | --- | --- |
| Europe | Cardmarket via TCGdex | EUR | Référence européenne, langue de la carte non filtrée |
| Amérique du Nord | TCGplayer via TCGdex | USD | Référence distincte du catalogue anglais; marché, puis prix intermédiaire, puis prix bas si le champ précédent manque |
| France | Pas de flux de ventes dédié | EUR | La cote Cardmarket Europe ne devient pas une cote française parce que le catalogue est FR |
| Royaume-Uni | Pas de flux local intégré | GBP | Le catalogue anglais ne suffit pas à produire un prix britannique; TCGplayer reste une référence nord-américaine en USD |
| Japon / chinois traditionnel | Aucun fournisseur local connecté | — | Cote locale indiquée comme indisponible; une éventuelle cote Cardmarket reste un repère européen distinct |

Les statistiques Cardmarket sont à plat pour le non-foil et utilisent des clés à tiret pour le holo. Les données TCGplayer sont imbriquées par finition (normal, holofoil, reverse-holofoil) et restent indépendantes les unes des autres. Une langue de catalogue ne prouve ni la langue de l'exemplaire coté ni l'identité exacte de son impression. TCGdex documente des correspondances de listings encore incorrectes pour certaines réimpressions et variantes; PokéValue doit donc afficher le fournisseur, la région, la devise et la portée réelle de la cote. Voir la [FAQ pricing de TCGdex](https://tcgdex.dev/fr/faq) et son [aperçu des marchés](https://tcgdex.dev/markets-prices).

## Échantillon fixe de validation du fournisseur

L'échantillon suivi est Pikachu 025 de Pokémon Card 151 : une fiche par catalogue FR, EN, JA et ZH-TW. Les fichiers de référence de la base TCGdex lient FR et EN au même produit Cardmarket (`733620`) et au même produit TCGplayer (`517033`). La fiche asiatique relie JA et ZH-TW au même produit Cardmarket (`719467`) et ne fournit pas de produit TCGplayer. Ces identifiants communs ne prouvent pas la langue physique de la carte ni un prix local japonais ou taïwanais.

Le validateur reproductible `npm run validate:price-sample` relit les quatre fiches de l'API, compare leurs identifiants aux correspondances fixes de la base, et imprime toutes les mesures numériques dans un rapport JSON avec marché, devise, langue du catalogue, variante, base de prix et horodatages. Il échoue si les correspondances attendues ne sont pas confirmées. L'API et les fichiers de référence doivent être comparés en direct avant de considérer TCGdex validé pour un déploiement; les échecs réseau ne sont pas interprétés comme des prix à zéro.

Chaque mesure Cardmarket est classée selon son champ source : `trend` comme guide; `avg`, `avg1`, `avg7` et `avg30` (y compris les champs holo) comme moyennes de ventes conclues; `low` comme niveau d'annonce. TCGplayer `marketPrice` et `midPrice` sont des mesures guide; `lowPrice`, `highPrice` et `directLowPrice` restent des agrégats d'offres. Ce sont des séries agrégées; l'API ne fournit ni lignes d'annonces individuelles ni transactions individuelles. La provenance distingue la place de marché (`source`) de l'agrégateur qui relaie les données (`aggregator`, ici TCGdex).

L’écran Collection sépare maintenant Cardmarket EUR et TCGplayer USD. Une référence TCGplayer peut utiliser le prix intermédiaire ou le prix bas si le prix marché est absent, et son libellé indique cette substitution. Pour les catalogues asiatiques, la référence Cardmarket n’entre plus dans la valeur totale locale; seules les valeurs EUR saisies manuellement y sont additionnées tant qu’une source asiatique n’est pas branchée. Les prix locaux JP et ZH-TW restent explicitement indisponibles. Les prix d’eBay et Vinted ne sont jamais présentés comme s’ils avaient été relevés.

## Vérification des places de marché

- **Cardmarket** reste la référence connectée pour l’Europe, mais la documentation de TCGdex ne fournit pas un filtre de langue pour la carte. Cardmarket indique actuellement ne pas accepter de nouvelles demandes d’accès API; ses identifiants ne doivent pas être partagés avec une application tierce ([aide officielle](https://help.cardmarket.com/en/cardmarket-api)).
- **eBay France / Royaume-Uni / Hong Kong** permet des recherches de listings actifs avec les Buy APIs, ce qui donne des prix demandés, pas des ventes conclues. L’accès de production aux Buy APIs est soumis à l’éligibilité et à l’approbation d’eBay. L’API Marketplace Insights, nécessaire pour l’historique de ventes, est restreinte et n’accepte pas de nouveaux utilisateurs ([Browse API](https://developer.ebay.com/develop/api/buy), [conditions et disponibilité](https://developer.ebay.com/api-docs/buy/ref-marketplace-supported.html)).
- **Vinted** ne fournit pas dans son API Pro une base de ventes de cartes par impression. Son endpoint de suggestions renvoie un prix maximum fondé sur catégorie, marque et état, et nécessite une authentification Pro ([documentation officielle](https://pro-docs.svc.vinted.com/)).
- Les annonces actives d’eBay ou Vinted ne sont pas une preuve de transaction. Pour une estimation réellement comparable, il faudrait des ventes terminées autorisées, reliées à la bonne langue, impression, variante, état et marché local. Aucun agrégateur actuellement vérifié ne couvre ces critères pour toutes les langues de PokéValue.

## Fournisseur candidat pour les prochaines versions

La [Pokémon TCG API indépendante](https://pokemontcgapi.com/) est le candidat le mieux structuré repéré le 13 octobre 2026 : chaque relevé indique source, base (annonce, guide, ventes), langue d’impression quand elle est connue, finition, devise, date et provenance. Sa documentation annonce Cardmarket Europe par langue d’impression, ainsi que TCGplayer et d’autres sources; elle permettrait donc de séparer une impression française et une anglaise, contrairement au schéma Cardmarket actuel de TCGdex. Il faut contrôler un échantillon réel avant intégration, car il s’agit d’un fournisseur tiers et les propres mesures publiées par l’API signalent des limites de couverture.

Limites relevées dans sa couverture en direct :

- Le catalogue distingue le Japon, mais les exemples de prix japonais observés sont en EUR et USD, sans cote locale JPY confirmée.
- Le catalogue chinois couvert est en chinois simplifié (région CN); la documentation constate zéro ligne de prix sur un échantillon CN. Cela ne couvre pas les cartes en chinois traditionnel de PokéValue.
- Les données eBay annoncées portent sur des cartes gradées et des prix demandés, pas sur les ventes conclues de cartes brutes.
- Le forfait Developer annoncé est de 29 €/mois. Une clé secrète doit rester côté serveur; le bundle public GitHub Pages ne peut pas la protéger. Il faudrait un relais serveur, puis comparer les réponses sur un jeu fixe de cartes françaises, anglaises et japonaises avant de remplacer ou compléter TCGdex.

Sources fournisseur : [couverture mesurée le 13/10/2026](https://pokemontcgapi.com/coverage), [méthodologie et limites des relevés](https://pokemontcgapi.com/price-methodology), [prix et forfaits](https://pokemontcgapi.com/pricing). Ses pages déclarent aussi explicitement que l’API n’est pas officielle Pokémon.

## Vérification des options locales (13 octobre 2026)

- La v2 de JustTCG sait représenter plusieurs régions, mais sa [documentation](https://www.justtcg.com/docs/api/cards-v2) indique que seule l’Amérique du Nord renvoie actuellement des prix; les régions UK, UE et Japon restent en attente de données locales.
- pokemontcgapi.com référence bien une grande base japonaise et des lignes EUR/USD; sa [page de couverture](https://pokemontcgapi.com/coverage) indique toutefois qu’un échantillon de cartes chinoises simplifiées ne renvoie aucune ligne de prix. Cela ne constitue donc pas une couverture confirmée des cartes chinoises traditionnelles de PokéValue, ni un prix local japonais en JPY.
- Aucune source examinée ne permet, sans approximation, de remplir à la fois les prix locaux JP et ZH-TW demandés. Le choix d’un fournisseur doit attendre une vérification de la couverture exacte des impressions, des devises et des droits d’affichage.

## Ajouter une source de prix asiatique

Aucune API actuellement intégrée ne fournit une cote japonaise ou chinoise vérifiée. Une intégration n'est fiable que si elle précise le pays/marché, la devise, la langue et l'impression visée, ainsi que l'horodatage et les conditions de redistribution des données.

Avant développement, choisir un fournisseur et confirmer ses droits d'accès et de redistribution. Une intégration nécessitant une clé doit passer par un relais serveur (Cloudflare Worker, Vercel Function ou backend équivalent), avec la clé exclusivement côté serveur. Ne jamais ajouter une clé secrète dans une variable VITE_* : le bundle GitHub Pages est public. Ne pas scraper des marketplaces.

Le schéma reste ouvert aux fournisseurs via MarketPriceProvider; chaque nouveau prix devra inclure sa région et sa devise et ne sera pas mélangé à la valeur EUR sans conversion explicite, traçable et autorisée.
