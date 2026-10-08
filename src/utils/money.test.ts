import {describe,expect,it} from 'vitest'
import {money} from './money'

describe('money formatting',()=>{
 it.each([[0.2,'0,20'],[1.5,'1,50'],[12.34,'12,34']])('keeps two decimal places for %s',(value,formatted)=>expect(money(value).replace(/\s/g,'')).toContain(formatted))
 it.each([0,1,20,125])('omits decimals for the whole amount %i',value=>expect(money(value).replace(/\s/g,'')).toBe(`${value}€`))
 it('rounds floating point totals to cents before choosing decimal places',()=>expect(money(0.1+0.2).replace(/\s/g,'')).toBe('0,30€'))
})
