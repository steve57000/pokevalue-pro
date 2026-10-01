import {describe,expect,it} from 'vitest'
import {resolveCatalogueImage} from './CatalogueImage'
const card={id:'xy-1',name:'Carte',localId:'1'}
describe('catalogue image providers',()=>{
 it('emploie un TCGdex anglais exact et le signale',async()=>{const image=await resolveCatalogueImage(card,'fr','low',async(id,language)=>({id,name:'Carte',language:language??'fr',image:language==='en'?'https://exact':undefined}));expect(image.url).toBe('https://exact/low.webp');expect(image.isFallback).toBe(true)})
 it('préfère le placeholder à une impression différente',async()=>{const image=await resolveCatalogueImage(card,'fr','low',async()=>({id:'xy-2',name:'Autre',language:'en',image:'https://wrong'}));expect(image.url).toBeUndefined();expect(image.source).toBe('none')})
 it('affiche le placeholder plutôt que le dos Pokémon dans la grille',async()=>{const image=await resolveCatalogueImage(card,'fr','low',async()=>({...card,language:'fr',image:'/images/pokemon-card-back.jpg'}));expect(image.url).toBeUndefined();expect(image.source).toBe('none')})
})
