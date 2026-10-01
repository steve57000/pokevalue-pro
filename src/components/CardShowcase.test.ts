import {describe,expect,it} from 'vitest'
import {dragRotation,flipRotation} from './CardShowcase'

describe('CardShowcase rotation',()=>{
 it('keeps the drag result available after pointer release',()=>{const result=dragRotation({x:10,y:10,rx:0,ry:0},{x:110,y:50});expect(result.x).toBe(-22);expect(result.y).toBeCloseTo(55)})
 it('flips cleanly between front and back after arbitrary dragging',()=>{expect(flipRotation({x:42,y:61})).toEqual({x:0,y:180});expect(flipRotation({x:-20,y:214})).toEqual({x:0,y:0})})
 it('clamps extreme pointer movement',()=>expect(dragRotation({x:0,y:0,rx:0,ry:0},{x:1000,y:-1000})).toEqual({x:180,y:180}))
})
