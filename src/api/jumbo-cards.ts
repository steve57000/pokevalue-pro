type JumboCardRecord = {
  id: string
  localId: string
  names: { fr?: string; en?: string }
  setId: string
  serieId: string
}

// TCGdex records Jumbo size as a variant of cards in their original sets,
// while the synthetic "jumbo" set only exposes a stale count and no card list.
// This snapshot contains every card record tagged with a Jumbo variant upstream.
const jumboCardRecords: readonly JumboCardRecord[] = [
  {
    "id": "base1-44",
    "localId": "44",
    "names": {
      "fr": "Bulbizarre",
      "en": "Bulbasaur"
    },
    "setId": "base1",
    "serieId": "base"
  },
  {
    "id": "base1-46",
    "localId": "46",
    "names": {
      "fr": "Salamèche",
      "en": "Charmander"
    },
    "setId": "base1",
    "serieId": "base"
  },
  {
    "id": "base1-58",
    "localId": "58",
    "names": {
      "fr": "Pikachu",
      "en": "Pikachu"
    },
    "setId": "base1",
    "serieId": "base"
  },
  {
    "id": "base1-63",
    "localId": "63",
    "names": {
      "fr": "Carapuce",
      "en": "Squirtle"
    },
    "setId": "base1",
    "serieId": "base"
  },
  {
    "id": "bog-1",
    "localId": "1",
    "names": {
      "en": "Electabuzz"
    },
    "setId": "bog",
    "serieId": "ecard"
  },
  {
    "id": "bog-2",
    "localId": "2",
    "names": {
      "en": "Hitmonchan"
    },
    "setId": "bog",
    "serieId": "ecard"
  },
  {
    "id": "bog-4",
    "localId": "4",
    "names": {
      "en": "Rocket’s Scizor"
    },
    "setId": "bog",
    "serieId": "ecard"
  },
  {
    "id": "bog-5",
    "localId": "5",
    "names": {
      "en": "Rocket’s Sneasel"
    },
    "setId": "bog",
    "serieId": "ecard"
  },
  {
    "id": "bog-6",
    "localId": "6",
    "names": {
      "en": "Dark Ivysaur"
    },
    "setId": "bog",
    "serieId": "ecard"
  },
  {
    "id": "bog-7",
    "localId": "7",
    "names": {
      "en": "Dark Venusaur"
    },
    "setId": "bog",
    "serieId": "ecard"
  },
  {
    "id": "bog-8",
    "localId": "8",
    "names": {
      "en": "Rocket’s Mewtwo"
    },
    "setId": "bog",
    "serieId": "ecard"
  },
  {
    "id": "bog-9",
    "localId": "9",
    "names": {
      "en": "Rocket’s Hitmonchan"
    },
    "setId": "bog",
    "serieId": "ecard"
  },
  {
    "id": "dp1-103",
    "localId": "103",
    "names": {
      "fr": "Tortipouss",
      "en": "Turtwig"
    },
    "setId": "dp1",
    "serieId": "dp"
  },
  {
    "id": "dp1-76",
    "localId": "76",
    "names": {
      "fr": "Ouisticram",
      "en": "Chimchar"
    },
    "setId": "dp1",
    "serieId": "dp"
  },
  {
    "id": "dp1-93",
    "localId": "93",
    "names": {
      "fr": "Tiplouf",
      "en": "Piplup"
    },
    "setId": "dp1",
    "serieId": "dp"
  },
  {
    "id": "dpp-DP24",
    "localId": "DP24",
    "names": {
      "fr": "Darkrai",
      "en": "Darkrai"
    },
    "setId": "dpp",
    "serieId": "dp"
  },
  {
    "id": "dpp-DP26",
    "localId": "DP26",
    "names": {
      "fr": "Dialga",
      "en": "Dialga"
    },
    "setId": "dpp",
    "serieId": "dp"
  },
  {
    "id": "dpp-DP27",
    "localId": "DP27",
    "names": {
      "fr": "Palkia",
      "en": "Palkia"
    },
    "setId": "dpp",
    "serieId": "dp"
  },
  {
    "id": "dpp-DP40",
    "localId": "DP40",
    "names": {
      "fr": "Regigigas",
      "en": "Regigigas"
    },
    "setId": "dpp",
    "serieId": "dp"
  },
  {
    "id": "dpp-DP50",
    "localId": "DP50",
    "names": {
      "fr": "Arceus",
      "en": "Arceus"
    },
    "setId": "dpp",
    "serieId": "dp"
  },
  {
    "id": "ecard1-1",
    "localId": "1",
    "names": {
      "fr": "Alakazam",
      "en": "Alakazam"
    },
    "setId": "ecard1",
    "serieId": "ecard"
  },
  {
    "id": "ecard1-12",
    "localId": "12",
    "names": {
      "fr": "Aligatueur",
      "en": "Feraligatr"
    },
    "setId": "ecard1",
    "serieId": "ecard"
  },
  {
    "id": "ecard1-66",
    "localId": "66",
    "names": {
      "fr": "Tyranocif",
      "en": "Tyranitar"
    },
    "setId": "ecard1",
    "serieId": "ecard"
  },
  {
    "id": "ecard2-10",
    "localId": "10",
    "names": {
      "fr": "Entei",
      "en": "Entei"
    },
    "setId": "ecard2",
    "serieId": "ecard"
  },
  {
    "id": "ecard2-11",
    "localId": "11",
    "names": {
      "fr": "Mentali",
      "en": "Espeon"
    },
    "setId": "ecard2",
    "serieId": "ecard"
  },
  {
    "id": "ecard2-32",
    "localId": "32",
    "names": {
      "fr": "Cizayox",
      "en": "Scizor"
    },
    "setId": "ecard2",
    "serieId": "ecard"
  },
  {
    "id": "ecard2-37",
    "localId": "37",
    "names": {
      "fr": "Suicune",
      "en": "Suicune"
    },
    "setId": "ecard2",
    "serieId": "ecard"
  },
  {
    "id": "ecard2-H21",
    "localId": "H21",
    "names": {
      "fr": "Cizayox",
      "en": "Scizor"
    },
    "setId": "ecard2",
    "serieId": "ecard"
  },
  {
    "id": "ecard3-146",
    "localId": "146",
    "names": {
      "en": "Charizard"
    },
    "setId": "ecard3",
    "serieId": "ecard"
  },
  {
    "id": "ecard3-147",
    "localId": "147",
    "names": {
      "en": "Crobat"
    },
    "setId": "ecard3",
    "serieId": "ecard"
  },
  {
    "id": "ecard3-149",
    "localId": "149",
    "names": {
      "en": "Ho-oh"
    },
    "setId": "ecard3",
    "serieId": "ecard"
  },
  {
    "id": "ecard3-150",
    "localId": "150",
    "names": {
      "en": "Kabutops"
    },
    "setId": "ecard3",
    "serieId": "ecard"
  },
  {
    "id": "ex1-59",
    "localId": "59",
    "names": {
      "fr": "Gobou",
      "en": "Mudkip"
    },
    "setId": "ex1",
    "serieId": "ex"
  },
  {
    "id": "ex1-74",
    "localId": "74",
    "names": {
      "fr": "Poussifeu",
      "en": "Torchic"
    },
    "setId": "ex1",
    "serieId": "ex"
  },
  {
    "id": "ex1-76",
    "localId": "76",
    "names": {
      "fr": "Arcko",
      "en": "Treecko"
    },
    "setId": "ex1",
    "serieId": "ex"
  },
  {
    "id": "ex1-94",
    "localId": "94",
    "names": {
      "fr": "Énergie Métal",
      "en": "Metal Energy"
    },
    "setId": "ex1",
    "serieId": "ex"
  },
  {
    "id": "ex2-93",
    "localId": "93",
    "names": {
      "fr": "Énergies multiples",
      "en": "Multi Energy"
    },
    "setId": "ex2",
    "serieId": "ex"
  },
  {
    "id": "gym1-11",
    "localId": "11",
    "names": {
      "en": "Rocket's Hitmonchan"
    },
    "setId": "gym1",
    "serieId": "gym"
  },
  {
    "id": "gym2-14",
    "localId": "14",
    "names": {
      "en": "Rocket's Mewtwo"
    },
    "setId": "gym2",
    "serieId": "gym"
  },
  {
    "id": "hgss4-101",
    "localId": "101",
    "names": {
      "fr": "Palkia & Dialga LÉGENDE",
      "en": "Palkia & Dialga LEGEND"
    },
    "setId": "hgss4",
    "serieId": "hgss"
  },
  {
    "id": "hgss4-99",
    "localId": "99",
    "names": {
      "fr": "Darkrai & Cresselia LÉGENDE",
      "en": "Darkrai & Cresselia LEGEND"
    },
    "setId": "hgss4",
    "serieId": "hgss"
  },
  {
    "id": "lc-29",
    "localId": "29",
    "names": {
      "en": "Mewtwo"
    },
    "setId": "lc",
    "serieId": "lc"
  },
  {
    "id": "lc-3",
    "localId": "3",
    "names": {
      "en": "Charizard"
    },
    "setId": "lc",
    "serieId": "lc"
  },
  {
    "id": "lc-4",
    "localId": "4",
    "names": {
      "en": "Dark Blastoise"
    },
    "setId": "lc",
    "serieId": "lc"
  },
  {
    "id": "lc-7",
    "localId": "7",
    "names": {
      "en": "Dark Raichu"
    },
    "setId": "lc",
    "serieId": "lc"
  },
  {
    "id": "mep-011",
    "localId": "011",
    "names": {
      "fr": "Méga-Latias-ex",
      "en": "Mega Latias ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-012",
    "localId": "012",
    "names": {
      "fr": "Méga-Lucario-ex",
      "en": "Mega Lucario ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-013",
    "localId": "013",
    "names": {
      "fr": "Méga-Florizarre-ex",
      "en": "Mega Venusaur ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-025",
    "localId": "025",
    "names": {
      "fr": "Méga-Kangourex-ex",
      "en": "Mega Kangaskhan ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-034",
    "localId": "034",
    "names": {
      "fr": "Méga-Méganium-ex",
      "en": "Mega Meganium ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-035",
    "localId": "035",
    "names": {
      "fr": "Méga-Roitiflam-ex",
      "en": "Mega Emboar ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-036",
    "localId": "036",
    "names": {
      "fr": "Méga-Aligatueur-ex",
      "en": "Mega Feraligatr ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-071",
    "localId": "071",
    "names": {
      "fr": "Méga-Zygarde-ex",
      "en": "Mega Zygarde ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-081",
    "localId": "081",
    "names": {
      "fr": "Méga-Amphinobi-ex",
      "en": "Mega Greninja ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-099",
    "localId": "099",
    "names": {
      "fr": "Amphinobi-ex",
      "en": "Greninja ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-100",
    "localId": "100",
    "names": {
      "fr": "Nymphali-ex",
      "en": "Sylveon ex"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-104",
    "localId": "104",
    "names": {
      "fr": "Mewtwo",
      "en": "Mewtwo"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-105",
    "localId": "105",
    "names": {
      "fr": "Mew",
      "en": "Mew"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "mep-Museum",
    "localId": "Museum",
    "names": {
      "en": "Pikachu at the Museum"
    },
    "setId": "mep",
    "serieId": "me"
  },
  {
    "id": "neo1-54",
    "localId": "54",
    "names": {
      "fr": "Germignon",
      "en": "Chikorita"
    },
    "setId": "neo1",
    "serieId": "neo"
  },
  {
    "id": "neo1-57",
    "localId": "57",
    "names": {
      "fr": "Héricendre",
      "en": "Cyndaquil"
    },
    "setId": "neo1",
    "serieId": "neo"
  },
  {
    "id": "neo1-81",
    "localId": "81",
    "names": {
      "fr": "Kaiminus",
      "en": "Totodile"
    },
    "setId": "neo1",
    "serieId": "neo"
  },
  {
    "id": "np-11",
    "localId": "11",
    "names": {
      "fr": "Flobio",
      "en": "Marshtomp"
    },
    "setId": "np",
    "serieId": "pop"
  },
  {
    "id": "np-4",
    "localId": "4",
    "names": {
      "fr": "Massko",
      "en": "Grovyle"
    },
    "setId": "np",
    "serieId": "pop"
  },
  {
    "id": "np-9",
    "localId": "9",
    "names": {
      "fr": "Galifeu",
      "en": "Combusken"
    },
    "setId": "np",
    "serieId": "pop"
  },
  {
    "id": "sm3-88",
    "localId": "88",
    "names": {
      "fr": "Darkrai GX",
      "en": "Darkrai GX"
    },
    "setId": "sm3",
    "serieId": "sm"
  },
  {
    "id": "sv02-061",
    "localId": "061",
    "names": {
      "fr": "Baojian-ex",
      "en": "Chien-Pao ex"
    },
    "setId": "sv02",
    "serieId": "sv"
  },
  {
    "id": "sv02-062",
    "localId": "062",
    "names": {
      "fr": "Pikachu",
      "en": "Pikachu"
    },
    "setId": "sv02",
    "serieId": "sv"
  },
  {
    "id": "sv02-117",
    "localId": "117",
    "names": {
      "fr": "Lougaroc-ex",
      "en": "Lycanroc ex"
    },
    "setId": "sv02",
    "serieId": "sv"
  },
  {
    "id": "sv03-015",
    "localId": "015",
    "names": {
      "fr": "Archéduc-ex",
      "en": "Decidueye ex"
    },
    "setId": "sv03",
    "serieId": "sv"
  },
  {
    "id": "sv03-125",
    "localId": "125",
    "names": {
      "fr": "Dracaufeu-ex",
      "en": "Charizard ex"
    },
    "setId": "sv03",
    "serieId": "sv"
  },
  {
    "id": "sv03.5-009",
    "localId": "009",
    "names": {
      "fr": "Tortank-ex",
      "en": "Blastoise ex"
    },
    "setId": "sv03.5",
    "serieId": "sv"
  },
  {
    "id": "sv03.5-205",
    "localId": "205",
    "names": {
      "fr": "Mew-ex",
      "en": "Mew ex"
    },
    "setId": "sv03.5",
    "serieId": "sv"
  },
  {
    "id": "sv04-038",
    "localId": "038",
    "names": {
      "fr": "Carchacrok-ex",
      "en": "Garchomp ex"
    },
    "setId": "sv04",
    "serieId": "sv"
  },
  {
    "id": "sv04-135",
    "localId": "135",
    "names": {
      "fr": "Exagide-ex",
      "en": "Aegislash ex"
    },
    "setId": "sv04",
    "serieId": "sv"
  },
  {
    "id": "sv05-034",
    "localId": "034",
    "names": {
      "fr": "Félinferno-ex",
      "en": "Incineroar ex"
    },
    "setId": "sv05",
    "serieId": "sv"
  },
  {
    "id": "sv05-081",
    "localId": "081",
    "names": {
      "fr": "Chef-de-Fer-ex",
      "en": "Iron Crown ex"
    },
    "setId": "sv05",
    "serieId": "sv"
  },
  {
    "id": "sv05-123",
    "localId": "123",
    "names": {
      "fr": "Ire-Foudre-ex",
      "en": "Raging Bolt ex"
    },
    "setId": "sv05",
    "serieId": "sv"
  },
  {
    "id": "sv06-040",
    "localId": "040",
    "names": {
      "fr": "Ogerpon Masque du Fourneau-ex",
      "en": "Hearthflame Mask Ogerpon ex"
    },
    "setId": "sv06",
    "serieId": "sv"
  },
  {
    "id": "sv06-130",
    "localId": "130",
    "names": {
      "fr": "Lanssorien-ex",
      "en": "Dragapult ex"
    },
    "setId": "sv06",
    "serieId": "sv"
  },
  {
    "id": "sv07-001",
    "localId": "001",
    "names": {
      "fr": "Florizarre-ex",
      "en": "Venusaur ex"
    },
    "setId": "sv07",
    "serieId": "sv"
  },
  {
    "id": "sv07-041",
    "localId": "041",
    "names": {
      "fr": "Amphinobi-ex",
      "en": "Greninja ex"
    },
    "setId": "sv07",
    "serieId": "sv"
  },
  {
    "id": "sv07-105",
    "localId": "105",
    "names": {
      "fr": "Melmetal-ex",
      "en": "Melmetal ex"
    },
    "setId": "sv07",
    "serieId": "sv"
  },
  {
    "id": "sv07-128",
    "localId": "128",
    "names": {
      "fr": "Terapagos-ex",
      "en": "Terapagos ex"
    },
    "setId": "sv07",
    "serieId": "sv"
  },
  {
    "id": "sv08-048",
    "localId": "048",
    "names": {
      "fr": "Kyurem Noir-ex",
      "en": "Black Kyurem ex"
    },
    "setId": "sv08",
    "serieId": "sv"
  },
  {
    "id": "sv08-076",
    "localId": "076",
    "names": {
      "fr": "Latias-ex",
      "en": "Latias ex"
    },
    "setId": "sv08",
    "serieId": "sv"
  },
  {
    "id": "sv08-130",
    "localId": "130",
    "names": {
      "fr": "Pondralugon-ex",
      "en": "Archaludon ex"
    },
    "setId": "sv08",
    "serieId": "sv"
  },
  {
    "id": "sv08.5-051",
    "localId": "051",
    "names": {
      "fr": "Lucario-ex",
      "en": "Lucario ex"
    },
    "setId": "sv08.5",
    "serieId": "sv"
  },
  {
    "id": "sv08.5-076",
    "localId": "076",
    "names": {
      "fr": "Ronflex-ex",
      "en": "Snorlax ex"
    },
    "setId": "sv08.5",
    "serieId": "sv"
  },
  {
    "id": "sv08.5-082",
    "localId": "082",
    "names": {
      "fr": "Lugia-ex",
      "en": "Lugia ex"
    },
    "setId": "sv08.5",
    "serieId": "sv"
  },
  {
    "id": "sv09-024",
    "localId": "024",
    "names": {
      "fr": "Braségali-ex",
      "en": "Blaziken ex"
    },
    "setId": "sv09",
    "serieId": "sv"
  },
  {
    "id": "sv09-030",
    "localId": "030",
    "names": {
      "fr": "Reshiram-ex",
      "en": "Reshiram ex"
    },
    "setId": "sv09",
    "serieId": "sv"
  },
  {
    "id": "sv09-069",
    "localId": "069",
    "names": {
      "fr": "Mimiqui-ex",
      "en": "Mimikyu ex"
    },
    "setId": "sv09",
    "serieId": "sv"
  },
  {
    "id": "sv09-075",
    "localId": "075",
    "names": {
      "fr": "Charmilly-ex",
      "en": "Alcremie ex"
    },
    "setId": "sv09",
    "serieId": "sv"
  },
  {
    "id": "sv09-114",
    "localId": "114",
    "names": {
      "fr": "Drattak-ex",
      "en": "Salamence ex"
    },
    "setId": "sv09",
    "serieId": "sv"
  },
  {
    "id": "sv10.5b-028",
    "localId": "028",
    "names": {
      "fr": "Kyurem-ex",
      "en": "Kyurem ex"
    },
    "setId": "sv10.5b",
    "serieId": "sv"
  },
  {
    "id": "svp-004",
    "localId": "004",
    "names": {
      "fr": "Mimiqui-ex",
      "en": "Mimikyu ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-018",
    "localId": "018",
    "names": {
      "fr": "Motorizard-ex",
      "en": "Cyclizar ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-049",
    "localId": "049",
    "names": {
      "fr": "Électhor-ex",
      "en": "Zapdos ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-067",
    "localId": "067",
    "names": {
      "fr": "Rugit-Lune-ex",
      "en": "Roaring Moon ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-068",
    "localId": "068",
    "names": {
      "fr": "Garde-de-Fer-ex",
      "en": "Iron Valiant ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-072",
    "localId": "072",
    "names": {
      "fr": "Fort-Ivoire-ex",
      "en": "Great Tusk ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-078",
    "localId": "078",
    "names": {
      "fr": "Miascarade-ex",
      "en": "Meowscarada ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-081",
    "localId": "081",
    "names": {
      "fr": "Flâmigator-ex",
      "en": "Skeledirge ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-084",
    "localId": "084",
    "names": {
      "fr": "Palmaval-ex",
      "en": "Quaquaval ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-086",
    "localId": "086",
    "names": {
      "fr": "Dogrino-ex",
      "en": "Mabosstiff ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-100",
    "localId": "100",
    "names": {
      "fr": "Tag-Tag-ex",
      "en": "Grafaiai ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-126",
    "localId": "126",
    "names": {
      "fr": "Superdofin-ex",
      "en": "Palafin ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-162",
    "localId": "162",
    "names": {
      "fr": "Tomberro-ex",
      "en": "Houndstone ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-177",
    "localId": "177",
    "names": {
      "fr": "Ursaking Lune Vermeille-ex",
      "en": "Bloodmoon Ursaluna ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-193",
    "localId": "193",
    "names": {
      "fr": "Zacian-ex de Nabil",
      "en": "Hop's Zacian ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-196",
    "localId": "196",
    "names": {
      "fr": "Dracaufeu-ex",
      "en": "Charizard ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-205",
    "localId": "205",
    "names": {
      "fr": "Mewtwo-ex de la Team Rocket",
      "en": "Team Rocket's Mewtwo ex"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-208",
    "localId": "208",
    "names": {
      "fr": "Victini",
      "en": "Victini"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "svp-500",
    "localId": "500",
    "names": {
      "en": "Terapagos & Friends"
    },
    "setId": "svp",
    "serieId": "sv"
  },
  {
    "id": "swsh10-099",
    "localId": "099",
    "names": {
      "fr": "Darkrai VSTAR",
      "en": "Darkrai VSTAR"
    },
    "setId": "swsh10",
    "serieId": "swsh"
  },
  {
    "id": "swsh11-048",
    "localId": "048",
    "names": {
      "fr": "Kyurem V",
      "en": "Kyurem V"
    },
    "setId": "swsh11",
    "serieId": "swsh"
  },
  {
    "id": "swsh11-131",
    "localId": "131",
    "names": {
      "fr": "Giratina VSTAR",
      "en": "Giratina VSTAR"
    },
    "setId": "swsh11",
    "serieId": "swsh"
  },
  {
    "id": "swsh12-139",
    "localId": "139",
    "names": {
      "fr": "Lugia VSTAR",
      "en": "Lugia VSTAR"
    },
    "setId": "swsh12",
    "serieId": "swsh"
  },
  {
    "id": "swsh12.5-095",
    "localId": "095",
    "names": {
      "fr": "Zacian V",
      "en": "Zacian V"
    },
    "setId": "swsh12.5",
    "serieId": "swsh"
  },
  {
    "id": "swsh12.5-100",
    "localId": "100",
    "names": {
      "fr": "Rayquaza V",
      "en": "Rayquaza V"
    },
    "setId": "swsh12.5",
    "serieId": "swsh"
  },
  {
    "id": "swsh2-70",
    "localId": "70",
    "names": {
      "fr": "Salarsen V",
      "en": "Toxtricity V"
    },
    "setId": "swsh2",
    "serieId": "swsh"
  },
  {
    "id": "swsh3-116",
    "localId": "116",
    "names": {
      "fr": "Éthernatos V",
      "en": "Eternatus V"
    },
    "setId": "swsh3",
    "serieId": "swsh"
  },
  {
    "id": "swsh3-69",
    "localId": "69",
    "names": {
      "fr": "Mew V",
      "en": "Mew V"
    },
    "setId": "swsh3",
    "serieId": "swsh"
  },
  {
    "id": "swsh4-43",
    "localId": "43",
    "names": {
      "fr": "Pikachu V",
      "en": "Pikachu V"
    },
    "setId": "swsh4",
    "serieId": "swsh"
  },
  {
    "id": "swsh5-86",
    "localId": "86",
    "names": {
      "fr": "Shifours Poing Final VMAX",
      "en": "Single Strike Urshifu VMAX"
    },
    "setId": "swsh5",
    "serieId": "swsh"
  },
  {
    "id": "swsh5-88",
    "localId": "88",
    "names": {
      "fr": "Shifours Mille Poings VMAX",
      "en": "Rapid Strike Urshifu VMAX"
    },
    "setId": "swsh5",
    "serieId": "swsh"
  },
  {
    "id": "swsh6-99",
    "localId": "99",
    "names": {
      "fr": "Roigada de Galar V",
      "en": "Galarian Slowking V"
    },
    "setId": "swsh6",
    "serieId": "swsh"
  },
  {
    "id": "swsh7-111",
    "localId": "111",
    "names": {
      "fr": "Rayquaza VMAX",
      "en": "Rayquaza VMAX"
    },
    "setId": "swsh7",
    "serieId": "swsh"
  },
  {
    "id": "swsh7-123",
    "localId": "123",
    "names": {
      "fr": "Duralugon VMAX",
      "en": "Duraludon VMAX"
    },
    "setId": "swsh7",
    "serieId": "swsh"
  },
  {
    "id": "swsh9-014",
    "localId": "014",
    "names": {
      "fr": "Shaymin VSTAR",
      "en": "Shaymin VSTAR"
    },
    "setId": "swsh9",
    "serieId": "swsh"
  },
  {
    "id": "swsh9-018",
    "localId": "018",
    "names": {
      "fr": "Dracaufeu VSTAR",
      "en": "Charizard VSTAR"
    },
    "setId": "swsh9",
    "serieId": "swsh"
  },
  {
    "id": "swsh9-123",
    "localId": "123",
    "names": {
      "fr": "Arceus VSTAR",
      "en": "Arceus VSTAR"
    },
    "setId": "swsh9",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH001",
    "localId": "SWSH001",
    "names": {
      "fr": "Ouistempo",
      "en": "Grookey"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH002",
    "localId": "SWSH002",
    "names": {
      "fr": "Flambino",
      "en": "Scorbunny"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH003",
    "localId": "SWSH003",
    "names": {
      "fr": "Larméléon",
      "en": "Sobble"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH005",
    "localId": "SWSH005",
    "names": {
      "fr": "Miaouss VMAX",
      "en": "Meowth VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH014",
    "localId": "SWSH014",
    "names": {
      "fr": "Gorythmic V",
      "en": "Rillaboom V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH015",
    "localId": "SWSH015",
    "names": {
      "fr": "Pyrobut V",
      "en": "Cinderace V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH016",
    "localId": "SWSH016",
    "names": {
      "fr": "Lézargus V",
      "en": "Inteleon V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH017",
    "localId": "SWSH017",
    "names": {
      "fr": "Salarsen V",
      "en": "Toxtricity V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH021",
    "localId": "SWSH021",
    "names": {
      "fr": "Polthégeist V",
      "en": "Polteageist V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH030",
    "localId": "SWSH030",
    "names": {
      "fr": "Pachyradjah V",
      "en": "Copperajah V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH043",
    "localId": "SWSH043",
    "names": {
      "fr": "Palarticho de Galar V",
      "en": "Galarian Sirfetch'd V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH045",
    "localId": "SWSH045",
    "names": {
      "fr": "Éthernatos VMAX",
      "en": "Eternatus VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH049",
    "localId": "SWSH049",
    "names": {
      "fr": "Moumouflon V",
      "en": "Dubwool V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH055",
    "localId": "SWSH055",
    "names": {
      "fr": "Sorcilence V",
      "en": "Hatterene V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH057",
    "localId": "SWSH057",
    "names": {
      "fr": "Angoliath V",
      "en": "Grimmsnarl V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH061",
    "localId": "SWSH061",
    "names": {
      "fr": "Pikachu V",
      "en": "Pikachu V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH078",
    "localId": "SWSH078",
    "names": {
      "fr": "Astronelle V",
      "en": "Orbeetle V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH083",
    "localId": "SWSH083",
    "names": {
      "fr": "Alakazam V",
      "en": "Alakazam V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH084",
    "localId": "SWSH084",
    "names": {
      "fr": "Blancoton V",
      "en": "Eldegoss V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH085",
    "localId": "SWSH085",
    "names": {
      "fr": "Fulgudog V",
      "en": "Boltund V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH086",
    "localId": "SWSH086",
    "names": {
      "fr": "Nigosier V",
      "en": "Cramorant V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH097",
    "localId": "SWSH097",
    "names": {
      "fr": "Lanssorien VMAX",
      "en": "Dragapult VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH099",
    "localId": "SWSH099",
    "names": {
      "fr": "Nostenfer VMAX",
      "en": "Crobat VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH102",
    "localId": "SWSH102",
    "names": {
      "fr": "Florizarre VMAX",
      "en": "Venusaur VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH103",
    "localId": "SWSH103",
    "names": {
      "fr": "Tortank VMAX",
      "en": "Blastoise VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH106",
    "localId": "SWSH106",
    "names": {
      "fr": "Shifours Poing Final V",
      "en": "Single Strike Urshifu V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH107",
    "localId": "SWSH107",
    "names": {
      "fr": "Shifours Mille Poings V",
      "en": "Rapid Strike Urshifu V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH111",
    "localId": "SWSH111",
    "names": {
      "fr": "Galopa de Galar V",
      "en": "Galarian Rapidash V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH130",
    "localId": "SWSH130",
    "names": {
      "fr": "Sylveroy Cavalier du Froid V",
      "en": "Ice Rider Calyrex V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH131",
    "localId": "SWSH131",
    "names": {
      "fr": "Sylveroy Cavalier d'Effroi V",
      "en": "Shadow Rider Calyrex V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH132",
    "localId": "SWSH132",
    "names": {
      "fr": "Lanssorien",
      "en": "Dragapult"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH133",
    "localId": "SWSH133",
    "names": {
      "fr": "Dracaufeu V de Peter",
      "en": "Lance's Charizard V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH134",
    "localId": "SWSH134",
    "names": {
      "fr": "Nymphali obscur V",
      "en": "Dark Sylveon V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH136",
    "localId": "SWSH136",
    "names": {
      "fr": "Mimiqui",
      "en": "Mimikyu"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH137",
    "localId": "SWSH137",
    "names": {
      "fr": "Salarsen lumineux",
      "en": "Light Toxtricity"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH138",
    "localId": "SWSH138",
    "names": {
      "fr": "Trioxhydre C",
      "en": "Hydreigon C"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH139",
    "localId": "SWSH139",
    "names": {
      "fr": "Pikachu V-UNION",
      "en": "Pikachu V-UNION"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH154",
    "localId": "SWSH154",
    "names": {
      "fr": "Dracolosse V",
      "en": "Dragonite V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH155",
    "localId": "SWSH155",
    "names": {
      "fr": "Amphinobi V-UNION",
      "en": "Greninja V-UNION"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH159",
    "localId": "SWSH159",
    "names": {
      "fr": "Mewtwo V-UNION",
      "en": "Mewtwo V-UNION"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH163",
    "localId": "SWSH163",
    "names": {
      "fr": "Zacian V-UNION",
      "en": "Zacian V-UNION"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH176",
    "localId": "SWSH176",
    "names": {
      "fr": "Hoopa V",
      "en": "Hoopa V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH180",
    "localId": "SWSH180",
    "names": {
      "fr": "Pyroli VMAX",
      "en": "Flareon VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH182",
    "localId": "SWSH182",
    "names": {
      "fr": "Aquali VMAX",
      "en": "Vaporeon VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH184",
    "localId": "SWSH184",
    "names": {
      "fr": "Voltali VMAX",
      "en": "Jolteon VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH195",
    "localId": "SWSH195",
    "names": {
      "fr": "Phyllali VSTAR",
      "en": "Leafeon VSTAR"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH197",
    "localId": "SWSH197",
    "names": {
      "fr": "Givrali VSTAR",
      "en": "Glaceon VSTAR"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH198",
    "localId": "SWSH198",
    "names": {
      "fr": "Pikachu V",
      "en": "Pikachu V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH214",
    "localId": "SWSH214",
    "names": {
      "fr": "Lucario VSTAR",
      "en": "Lucario VSTAR"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH215",
    "localId": "SWSH215",
    "names": {
      "fr": "Morpeko V-UNION",
      "en": "Morpeko V-UNION"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH219",
    "localId": "SWSH219",
    "names": {
      "fr": "Fulgudog V",
      "en": "Boltund V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH225",
    "localId": "SWSH225",
    "names": {
      "fr": "Noadkoko d'Alola V",
      "en": "Alolan Exeggutor V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH226",
    "localId": "SWSH226",
    "names": {
      "fr": "Capitaine d'équipe Spark",
      "en": "Spark"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH227",
    "localId": "SWSH227",
    "names": {
      "fr": "Capitaine d'équipe Blanche",
      "en": "Blanche"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH228",
    "localId": "SWSH228",
    "names": {
      "fr": "Capitaine d'équipe Candela",
      "en": "Candela"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH230",
    "localId": "SWSH230",
    "names": {
      "fr": "Évoli Radieux",
      "en": "Radiant Eevee"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH249",
    "localId": "SWSH249",
    "names": {
      "fr": "Hachécateur VSTAR",
      "en": "Kleavor VSTAR"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH252",
    "localId": "SWSH252",
    "names": {
      "fr": "Simiabraz V",
      "en": "Infernape V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH254",
    "localId": "SWSH254",
    "names": {
      "fr": "Palkia Originel VSTAR",
      "en": "Origin Forme Palkia VSTAR"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH256",
    "localId": "SWSH256",
    "names": {
      "fr": "Dialga Originel VSTAR",
      "en": "Origin Forme Dialga VSTAR"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH265",
    "localId": "SWSH265",
    "names": {
      "fr": "Zeraora VSTAR",
      "en": "Zeraora VSTAR"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH268",
    "localId": "SWSH268",
    "names": {
      "fr": "Deoxys VSTAR",
      "en": "Deoxys VSTAR"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH280",
    "localId": "SWSH280",
    "names": {
      "fr": "Regieleki V",
      "en": "Regieleki V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH281",
    "localId": "SWSH281",
    "names": {
      "fr": "Regidrago V",
      "en": "Regidrago V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH286",
    "localId": "SWSH286",
    "names": {
      "fr": "Pikachu VMAX",
      "en": "Pikachu VMAX"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH287",
    "localId": "SWSH287",
    "names": {
      "fr": "Morpeko V-UNION",
      "en": "Morpeko V-UNION"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH292",
    "localId": "SWSH292",
    "names": {
      "fr": "Zacian V",
      "en": "Zacian V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH293",
    "localId": "SWSH293",
    "names": {
      "fr": "Zamazenta V",
      "en": "Zamazenta V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH294",
    "localId": "SWSH294",
    "names": {
      "fr": "Électrode de Hisui V",
      "en": "Hisuian Electrode V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH295",
    "localId": "SWSH295",
    "names": {
      "fr": "Viridium V",
      "en": "Virizion V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH298",
    "localId": "SWSH298",
    "names": {
      "fr": "Zoroark de Hisui VSTAR",
      "en": "Hisuian Zoroark VSTAR"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH299",
    "localId": "SWSH299",
    "names": {
      "fr": "Jirachi V",
      "en": "Jirachi V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  },
  {
    "id": "swshp-SWSH301",
    "localId": "SWSH301",
    "names": {
      "fr": "Lugia V",
      "en": "Lugia V"
    },
    "setId": "swshp",
    "serieId": "swsh"
  }
]

export const JUMBO_CARD_COUNT = jumboCardRecords.length

export const getJumboCards = (language: string) => jumboCardRecords.map(card => ({
  id: card.id,
  name: card.names[language as 'fr' | 'en'] ?? card.names.en ?? card.names.fr ?? card.id,
  localId: card.localId,
  image: `https://assets.tcgdex.net/en/${card.serieId}/${card.setId}/${card.localId}`,
}))
