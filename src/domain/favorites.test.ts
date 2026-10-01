import {beforeEach,describe,expect,it} from 'vitest'
import {createFavorite,favoriteKey,parseFavorites} from './favorites'
import {migrateLegacyFavorites} from '../hooks/useFavorites'
import type {Card} from '../types'

const base={source:'tcgdex' as const,cardId:'base1-25',setId:'base1',name:'Pikachu',setName:'Set de Base'}
describe('favorites',()=>{
 beforeEach(()=>{const values=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key),clear:()=>values.clear()}})})
 it('distinguishes two languages of the same printing',()=>expect(favoriteKey({...base,language:'fr'})).not.toBe(favoriteKey({...base,language:'ja'})))
 it('parses valid favorites and rejects corrupt values',()=>expect(parseFavorites([createFavorite({...base,language:'fr'}),null,{name:'incomplet'}])).toHaveLength(1))
 it('migrates known legacy editorial ids without inventing unknown cards',()=>{const card={id:'pika',name:'Pikachu',pokemon:'Pikachu',set:'Base',year:1999,number:'25',rarity:'Rare',language:'FR',rawMin:1,rawMax:2,graded10:3,trend:'up',score:1,color:'#000',accent:'#fff',note:''} satisfies Card;localStorage.setItem('pv-favorites',JSON.stringify(['pika','missing']));expect(migrateLegacyFavorites([card])).toMatchObject([{cardId:'pika',language:'fr',source:'editorial'}])})
})
