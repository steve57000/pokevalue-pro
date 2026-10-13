const anniversaryLogo='https://www.pokepedia.fr/images/thumb/0/0c/Logo_30e_Anniversaire_JCC.png/800px-Logo_30e_Anniversaire_JCC.png'

/**
 * Explicit, reviewed logo fallbacks keyed by stable catalogue IDs.
 * Never infer a logo from a translated name, symbol, or neighboring set.
 */
const curatedSetLogosById:Record<string,string[]>={
 mep:['https://data.eyevo.app/eyevo/logos/sets/mep.png'],
 me01:['https://www.pokepedia.fr/images/thumb/8/83/Logo_Méga-%C3%89volution_JCC.png/800px-Logo_Méga-%C3%89volution_JCC.png'],
 me02:['https://www.pokepedia.fr/images/thumb/1/18/Logo_Méga-%C3%89volution_Flammes_Fantasmagoriques_JCC.png/800px-Logo_Méga-%C3%89volution_Flammes_Fantasmagoriques_JCC.png'],
 'me02.5':['https://www.pokepedia.fr/images/thumb/4/4c/Logo_Méga-%C3%89volution_Héros_Transcendants_JCC.png/800px-Logo_Méga-%C3%89volution_Héros_Transcendants_JCC.png'],
 me03:['https://www.pokepedia.fr/images/thumb/c/c6/Logo_Méga-%C3%89volution_Équilibre_Parfait_JCC.png/800px-Logo_Méga-%C3%89volution_Équilibre_Parfait_JCC.png'],
 me04:['https://www.pokepedia.fr/images/thumb/2/2a/Logo_Méga-%C3%89volution_Chaos_Ascendant_JCC.png/800px-Logo_Méga-%C3%89volution_Chaos_Ascendant_JCC.png'],
 me05:['https://www.pokepedia.fr/images/thumb/6/67/Logo_Méga-%C3%89volution_Nuit_Noire_JCC.png/800px-Logo_Méga-%C3%89volution_Nuit_Noire_JCC.png'],
 '30th':[anniversaryLogo],
 '30th-c':['https://assets.binderdex.com/tcg/sets/pkmn/30th-celebration-classic-collection/logo.png',anniversaryLogo],
}

const curatedSeriesLogosById:Record<string,string[]>={
 me:['https://www.pokepedia.fr/images/thumb/8/83/Logo_Méga-%C3%89volution_JCC.png/800px-Logo_Méga-%C3%89volution_JCC.png'],
 '30th':[anniversaryLogo],
}
const asianLogoFallback=(language:string)=>language==='ja'||language==='zh-tw'

export const tcgdexLogoSources=(url?:string)=>{
 if(!url)return[]
 const value=url.trim()
 if(!value)return[]
 if(!/assets\.tcgdex\.net\//i.test(value))return[value]
 const match=value.match(/^([^?#]*)([?#].*)?$/)
 if(!match)return[value]
 const path=match[1].replace(/\/+$/,'')
 const suffix=match[2]??''
 const extension=path.match(/\.(webp|png|jpe?g)$/i)?.[1]?.toLowerCase()
 if(extension){
  const stem=path.slice(0,-extension.length-1)
  const alternates=extension==='png'?['webp']:extension==='webp'?['png']:[]
  return [...new Set([value,...alternates.map(format=>stem+'.'+format+suffix)])]
 }
 return[path+'.png'+suffix,path+'.webp'+suffix]
}

export const normalizeTcgDexLogoPath=(url?:string)=>{
 if(!url)return undefined
 return url.replace(/(assets\.tcgdex\.net\/(?:en|fr|ja|zh-tw)\/)([^/]+)\/([^/]+)\//i,(_match,prefix,serie,set)=>prefix+serie.toLowerCase()+'/'+set.toLowerCase()+'/')
}

export const seriesLogoSources=(seriesId:string,logo?:string,language='fr')=>{
 const curated=curatedSeriesLogosById[seriesId.toLowerCase()]??[]
 // French keeps its reviewed logo first; all other catalogs prefer their own logo.
 const paths=language==='fr'?[...curated,logo,normalizeTcgDexLogoPath(logo)]:[logo,normalizeTcgDexLogoPath(logo),...curated]
 return [...new Set(paths.flatMap(tcgdexLogoSources).filter(Boolean))]
}

export const setLogoSources=(setId:string,_seriesId?:string,logo?:string,_symbol?:string,_name='',language='fr',parentLogo?:string)=>{
 const curated=curatedSetLogosById[setId.toLowerCase()]??[]
 // Keep verified French marks first for FR, but do not let a missing EN catalog logo
 // skip the exact-ID fallback. Asian catalogs prefer their native asset, then the
 // exact-ID curated mark, then a family mark as a last-resort placeholder.
 const paths=language==='fr'
  ? [...curated,logo,normalizeTcgDexLogoPath(logo)]
  : asianLogoFallback(language)
   ? [logo,normalizeTcgDexLogoPath(logo),...curated,parentLogo,normalizeTcgDexLogoPath(parentLogo)]
   : [logo,normalizeTcgDexLogoPath(logo),...curated]
 return [...new Set(paths.flatMap(tcgdexLogoSources).filter(Boolean))]
}
