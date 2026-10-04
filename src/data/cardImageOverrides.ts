export type CardImageOverride={
 cardId:string
 setId:string
 name:string
 englishName?:string
 printedNumber:string
 image?:{localPath:string;language:string;source:string;verified:true}
 cardmarket?:{directUrl?:string;searchName:string;searchCode?:string}
 verified:boolean
}

// RGB rares use their color letter rather than a numbered collector ID.
export const rgbMewImageByNumber: Readonly<Record<string,{url:string;language:string}>>={
 R:{url:'https://billsarchive.com/assets/articles/rgb-mew-red.webp',language:'fr'},
 G:{url:'https://billsarchive.com/assets/articles/rgb-mew-green.webp',language:'en'},
 B:{url:'https://billsarchive.com/assets/articles/rgb-mew-blue.webp',language:'en'},
}

// These identities describe the 30th-anniversary reprints. When TCGdex has no scan,
// use the matching English TCGplayer product image and identify it as an English fallback.
const baseCardImageOverrides:readonly CardImageOverride[]=[
  {cardId:'30th-c-001',setId:'30th-c',name:'Dracaufeu',englishName:'Charizard',printedNumber:'4/102',cardmarket:{searchName:'Charizard',searchCode:'30C'},verified:false},
  {cardId:'30th-c-002',setId:'30th-c',name:'Delcatty',englishName:'Delcatty',printedNumber:'5/109',cardmarket:{searchName:'Delcatty',searchCode:'30C'},verified:false},
  {cardId:'30th-c-003',setId:'30th-c',name:'Métalosse δ Espèces Delta',englishName:'Metagross δ Delta Species',printedNumber:'11/113',cardmarket:{searchName:'Metagross δ Delta Species',searchCode:'30C'},verified:false},
  {cardId:'30th-c-004',setId:'30th-c',name:'Genesect-EX',englishName:'Genesect-EX',printedNumber:'11/101',cardmarket:{searchName:'Genesect-EX',searchCode:'30C'},verified:false},
  {cardId:'30th-c-005',setId:'30th-c',name:'Ondine',englishName:'Misty',printedNumber:'18/132',cardmarket:{searchName:'Misty',searchCode:'30C'},verified:false},
  {cardId:'30th-c-006',setId:'30th-c',name:'Tyranocif obscur',englishName:'Dark Tyranitar',printedNumber:'19/109',cardmarket:{searchName:'Dark Tyranitar',searchCode:'30C'},verified:false},
  {cardId:'30th-c-007',setId:'30th-c',name:'Farfuret',englishName:'Sneasel',printedNumber:'25/111',cardmarket:{searchName:'Sneasel',searchCode:'30C'},verified:false},
  {cardId:'30th-c-008',setId:'30th-c',name:'Pikachu et Zekrom-GX',englishName:'Pikachu & Zekrom-GX',printedNumber:'33/181',cardmarket:{searchName:'Pikachu & Zekrom-GX',searchCode:'30C'},verified:false},
  {cardId:'30th-c-009',setId:'30th-c',name:'Amphinobi TURBO',englishName:'Greninja BREAK',printedNumber:'41/122',cardmarket:{searchName:'Greninja BREAK',searchCode:'30C'},verified:false},
  {cardId:'30th-c-010',setId:'30th-c',name:'Créhelf',englishName:'Uxie',printedNumber:'43/146',cardmarket:{searchName:'Uxie',searchCode:'30C'},verified:false},
  {cardId:'30th-c-011',setId:'30th-c',name:'Nostenfer G',englishName:'Crobat G',printedNumber:'47/127',cardmarket:{searchName:'Crobat G',searchCode:'30C'},verified:false},
  {cardId:'30th-c-012',setId:'30th-c',name:'Raikou',englishName:'Raikou',printedNumber:'050/185',cardmarket:{searchName:'Raikou',searchCode:'30C'},verified:false},
  {cardId:'30th-c-013',setId:'30th-c',name:'Mouscoto-GX',englishName:'Buzzwole-GX',printedNumber:'57/111',cardmarket:{searchName:'Buzzwole-GX',searchCode:'30C'},verified:false},
  {cardId:'30th-c-014',setId:'30th-c',name:'Pikachu',englishName:'Pikachu',printedNumber:'58/102',cardmarket:{searchName:'Pikachu',searchCode:'30C'},verified:false},
  {cardId:'30th-c-015',setId:'30th-c',name:"Rondoudou d'Erika",englishName:"Erika's Jigglypuff",printedNumber:'69/132',cardmarket:{searchName:"Erika's Jigglypuff",searchCode:'30C'},verified:false},
  {cardId:'30th-c-016',setId:'30th-c',name:'Rayquaza-EX',englishName:'Rayquaza-EX',printedNumber:'85/124',cardmarket:{searchName:'Rayquaza-EX',searchCode:'30C'},verified:false},
  {cardId:'30th-c-017',setId:'30th-c',name:'Solgaleo-GX',englishName:'Solgaleo-GX',printedNumber:'89/149',cardmarket:{searchName:'Solgaleo-GX',searchCode:'30C'},verified:false},
  {cardId:'30th-c-018',setId:'30th-c',name:'Ectoplasma',englishName:'Gastly',printedNumber:'94/102',cardmarket:{searchName:'Gastly',searchCode:'30C'},verified:false},
  {cardId:'30th-c-019',setId:'30th-c',name:'Darkrai & Cresselia LÉGENDE',englishName:'Darkrai & Cresselia LEGEND',printedNumber:'99/102',cardmarket:{searchName:'Darkrai & Cresselia LEGEND',searchCode:'30C'},verified:false},
  {cardId:'30th-c-020',setId:'30th-c',name:'Darkrai & Cresselia LÉGENDE',englishName:'Darkrai & Cresselia LEGEND',printedNumber:'100/102',cardmarket:{searchName:'Darkrai & Cresselia LEGEND',searchCode:'30C'},verified:false},
  {cardId:'30th-c-021',setId:'30th-c',name:'N',englishName:'N',printedNumber:'101/101',cardmarket:{searchName:'N',searchCode:'30C'},verified:false},
  {cardId:'30th-c-022',setId:'30th-c',name:'Palkia Niv.X',englishName:'Palkia LV.X',printedNumber:'106/106',cardmarket:{searchName:'Palkia LV.X',searchCode:'30C'},verified:false},
  {cardId:'30th-c-023',setId:'30th-c',name:'M-Gardevoir-EX',englishName:'M Gardevoir-EX',printedNumber:'106/160',cardmarket:{searchName:'M Gardevoir-EX',searchCode:'30C'},verified:false},
  {cardId:'30th-c-024',setId:'30th-c',name:'Celebi Brillant',englishName:'Shining Celebi',printedNumber:'106/105',cardmarket:{searchName:'Shining Celebi',searchCode:'30C'},verified:false},
  {cardId:'30th-c-025',setId:'30th-c',name:'Cizayox ex',englishName:'Scizor ex',printedNumber:'108/115',cardmarket:{searchName:'Scizor ex',searchCode:'30C'},verified:false},
  {cardId:'30th-c-026',setId:'30th-c',name:'Mew-VMAX',englishName:'Mew VMAX',printedNumber:'114/264',cardmarket:{searchName:'Mew VMAX',searchCode:'30C'},verified:false},
  {cardId:'30th-c-027',setId:'30th-c',name:'Arceus-VSTAR',englishName:'Arceus VSTAR',printedNumber:'123/172',cardmarket:{searchName:'Arceus VSTAR',searchCode:'30C'},verified:false},
  {cardId:'30th-c-028',setId:'30th-c',name:'Zacian-V',englishName:'Zacian V',printedNumber:'138/202',cardmarket:{searchName:'Zacian V',searchCode:'30C'},verified:false},
  {cardId:'30th-c-029',setId:'30th-c',name:'Lugia',englishName:'Lugia',printedNumber:'149/147',cardmarket:{searchName:'Lugia',searchCode:'30C'},verified:false},
  {cardId:'30th-c-030',setId:'30th-c',name:'Magicarpe',englishName:'Magikarp',printedNumber:'203/193',cardmarket:{searchName:'Magikarp',searchCode:'30C'},verified:false},
]

// These anniversary reprints do not yet have dedicated TCGdex scans. Their artwork is
// matched to the corresponding original print using the published Classic Collection checklist.
// The verified scans below are used because the previous TCGplayer thumbnails were not
// readable by the app's PDF canvas.
// The TCGplayer thumbnail URLs previously used here did not expose usable images in
// the app's PDF canvas. These Bill's Archive / TCGdex scans are stable WebP images
// with browser-readable CORS headers; they keep the correct card artwork visible.
const classicOriginalScans:Record<string,string>={
 '30th-c-001':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/base1/base1-4_charizard.webp',
 '30th-c-002':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/ex1/ex1-5_delcatty.webp',
 '30th-c-003':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/ex11/ex11-11_metagross-%CE%B4.webp',
 '30th-c-004':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/bw10/bw10-11_genesect-ex.webp',
 '30th-c-005':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/gym1/gym1-18_misty.webp',
 '30th-c-006':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/ex7/ex7-19_dark-tyranitar.webp',
 '30th-c-007':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/neo1/neo1-25_sneasel.webp',
 '30th-c-008':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/sm9/sm9-33_pikachu-zekrom-gx.webp',
 '30th-c-009':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/xy9/xy9-41_greninja-break.webp',
 '30th-c-010':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/dp6/dp6-43_uxie.webp',
 '30th-c-011':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/pl1/pl1-47_crobat-g.webp',
 '30th-c-012':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/swsh4/swsh4-50_raikou.webp',
 '30th-c-013':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/sm4/sm4-57_buzzwole-gx.webp',
 '30th-c-014':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/base1/base1-58_pikachu.webp',
 '30th-c-015':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/gym2/gym2-69_erikas-jigglypuff.webp',
 '30th-c-016':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/bw6/bw6-85_rayquaza-ex.webp',
 '30th-c-017':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/sm1/sm1-89_solgaleo-gx.webp',
 '30th-c-018':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/hgss4/hgss4-94_gengar.webp',
 '30th-c-019':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/hgss4/hgss4-99_darkrai-cresselia-legend.webp',
 '30th-c-020':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/hgss4/hgss4-100_darkrai-cresselia-legend.webp',
 '30th-c-021':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/bw3/bw3-92_n.webp',
 '30th-c-022':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/dp4/dp4-106_palkia.webp',
 '30th-c-023':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/xy5/xy5-106_m-gardevoir-ex.webp',
 '30th-c-024':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/neo4/neo4-106_shining-celebi.webp',
 '30th-c-025':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/ex10/ex10-108_scizor-ex.webp',
 '30th-c-026':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/swsh8/swsh8-114_mew-vmax.webp',
 '30th-c-027':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/swsh9/swsh9-123_arceus-vstar.webp',
 '30th-c-028':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/swsh1/swsh1-138_zacian-v.webp',
 '30th-c-029':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/ecard2/ecard2-149_lugia.webp',
 '30th-c-030':'https://bills-archive.nyc3.cdn.digitaloceanspaces.com/tcgdex_cards/sv02/sv02-203_magikarp.webp',
}
export const cardImageOverrides:readonly CardImageOverride[]=baseCardImageOverrides.map(item=>{
 const url=classicOriginalScans[item.cardId]
 if(!url)return item
 return {...item,verified:true,image:{localPath:url,language:'en',source:'Bill’s Archive / TCGdex original scan',verified:true as const}}
})
export const cardImageOverrideById=new Map(cardImageOverrides.map(item=>[item.cardId,item]))
