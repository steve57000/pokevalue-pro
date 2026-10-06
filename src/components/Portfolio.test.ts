import {describe,expect,it} from 'vitest'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {CollectionQuantityStepper,effectiveCollectionColumns,maxCollectionColumns,minCollectionColumns} from './Portfolio'
describe('collection density',()=>{
 it.each([[339,1],[340,2],[639,2],[640,3],[899,3],[900,4],[1199,4],[1200,5],[1920,5]])('limits %ipx to %i columns',(width,columns)=>expect(maxCollectionColumns(width)).toBe(columns))
 it.each([[1,339],[1,340],[1,639],[2,640],[2,899],[3,900],[3,1199],[3,1200]])('requires at least %i columns at %ipx',(columns,width)=>expect(minCollectionColumns(width)).toBe(columns))
 it('clamps preferences to the screen while preserving the saved preference',()=>{const preference=5;expect(effectiveCollectionColumns(preference,390)).toBe(2);expect(effectiveCollectionColumns(preference,1280)).toBe(5);expect(effectiveCollectionColumns(1,390)).toBe(1);expect(effectiveCollectionColumns(1,900)).toBe(3)})
 it.each([3,4,5])('honours desktop preference %i when it fits',columns=>expect(effectiveCollectionColumns(columns,1920)).toBe(columns))
 it('does not render a quantity stepper before a card is owned',()=>expect(renderToStaticMarkup(createElement(CollectionQuantityStepper,{cardName:'Pikachu',flash:false,onDecrement:()=>{},onIncrement:()=>{}}))).toBe(''))
})
