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

// These exact anniversary reprints have no TCGdex scans yet. Product images
// are matched by the card names and original numbers in TCGJoin's Classic
// Collection gallery, which identifies TCGplayer as the image source.
const classicProductIds:Record<string,number>={
 '30th-c-001':714372,'30th-c-002':716156,'30th-c-003':716157,'30th-c-004':716158,'30th-c-005':716159,
 '30th-c-006':716160,'30th-c-007':716161,'30th-c-008':714373,'30th-c-009':716162,'30th-c-010':716163,
 '30th-c-011':716191,'30th-c-012':716192,'30th-c-013':716193,'30th-c-014':716194,'30th-c-015':716195,
 '30th-c-016':716196,'30th-c-017':716197,'30th-c-018':716198,'30th-c-019':716199,'30th-c-020':716200,
 '30th-c-021':716202,'30th-c-022':716203,'30th-c-023':716204,'30th-c-024':716205,'30th-c-025':716206,
 '30th-c-026':716207,'30th-c-027':716208,'30th-c-028':716209,'30th-c-029':714386,'30th-c-030':716210,
}
export const cardImageOverrides:readonly CardImageOverride[]=baseCardImageOverrides.map(item=>{
 const productId=classicProductIds[item.cardId]
 if(!productId)return item
 return {...item,verified:true,image:{localPath:`https://tcgplayer-cdn.tcgplayer.com/product/${productId}_400w.jpg`,language:'en',source:'TCGplayer product image',verified:true as const}}
})
export const cardImageOverrideById=new Map(cardImageOverrides.map(item=>[item.cardId,item]))
