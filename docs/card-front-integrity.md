# Rectos et retournement — 23 novembre 2026

## Corrections

- Le recto et le verso sont affichés exclusivement selon la face réellement
  visible après rotation sur les deux axes. Le bouton « Voir le recto » remet
  aussi les angles à zéro. Une nouvelle carte repart toujours du recto.
- Les essais d’images et les erreurs sont réinitialisés lorsqu’on change de
  carte, de langue ou de qualité ; une ancienne résolution ne peut pas rester
  attachée à la nouvelle carte.
- Le scanner et le catalogue refusent les adresses explicites de dos et de
  placeholders, y compris WebP et chemins encodés.
- Les chemins anglais ne sont plus construits pour n’importe quel set TCGdex.
  Les noms de sets diffèrent entre fournisseurs (`me06` / `me6`, `30th` /
  `me55`, `sv08.5` / `sv8pt5`). La liste publique de Pokémon TCG Data fixe
  les sets autorisés, et ses huit catalogues Méga-Évolution fixent les 1 281
  identités connues. Les images de 963 de ces cartes sont publiées sur Scrydex :
  leur ancien chemin `images.pokemontcg.io` est rejeté, même depuis un cache.
- Un recto anglais exact est préféré à un secours français lorsqu’on consulte
  une carte anglaise. Les secours dans une autre langue restent signalés.

## Vérifications et limites

Un contrôle de téléchargement a porté sur 178 fichiers publics :
141 rectos français ME06, 30 rectos anglais
Classic Collection, quatre promos MEP anglaises et trois Mew RGB. Aucun
échec HTTP ni fichier dupliqué dans ce contrôle ; les planches ME06 et Classic
ont également été inspectées visuellement.

Le contrôle mobile dans Chrome confirme un recto 30e Anniversaire, le passage
au verso et le retour au recto, ainsi que le recto français de Rayquaza 138 et
ses prix FR / EN distincts. Il ne constitue pas un test sur un iPhone physique.
Les tests automatisés couvrent aussi la rotation manuelle puis le retour au
recto et le changement de carte pendant l’affichage du verso.

Les correspondances anglaises récentes proviennent des champs `images` du
dépôt public https://github.com/PokemonTCG/pokemon-tcg-data . Le serveur Scrydex
a répondu 403 au téléchargement depuis l’environnement de contrôle : ses
963 fichiers n’ont donc pas été tous vérifiés visuellement. Les autres
sources exactes restent disponibles en repli ; en dernier recours, un message
« Visuel indisponible » est affiché, jamais un dos choisi comme illustration.

Cet audit ne prétend pas couvrir chaque fichier de tous les catalogues
internationaux. Aucun visuel n’a été généré ou emprunté à une autre édition.
