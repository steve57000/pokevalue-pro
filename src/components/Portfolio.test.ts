import {describe,expect,it} from 'vitest'
import {effectiveCollectionColumns,maxCollectionColumns} from './Portfolio'
describe('collection density',()=>{
 it.each([[339,1],[340,2],[639,2],[640,3],[899,3],[900,4],[1199,4],[1200,5],[1920,5]])('limits %ipx to %i columns',(width,columns)=>expect(maxCollectionColumns(width)).toBe(columns))
 it('clamps temporarily without overwriting the desktop preference',()=>{const preference=5;expect(effectiveCollectionColumns(preference,390)).toBe(2);expect(effectiveCollectionColumns(preference,1280)).toBe(5)})
 it.each([1,2,3,4,5])('honours preference %i on a large container',columns=>expect(effectiveCollectionColumns(columns,1920)).toBe(columns))
})
