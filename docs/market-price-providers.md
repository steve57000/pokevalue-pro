# Fournisseurs de prix

Le frontend utilise aujourd’hui TCGdex comme référence de marché disponible pour une impression. Ce flux ne garantit pas une segmentation par langue physique.

Une intégration future de JustTCG doit implémenter `MarketPriceProvider` via un relais serveur (Cloudflare Worker, Vercel Function ou backend équivalent). La clé reste exclusivement côté serveur. **Ne jamais ajouter de `VITE_JUSTTCG_API_KEY`** : toute variable Vite est publiée dans le bundle GitHub Pages.
