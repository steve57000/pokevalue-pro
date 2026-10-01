import {describe,expect,it} from 'vitest'
import {getGradingInterest} from './grading'
describe('gradation',()=>{it('reste heuristique et ne fabrique aucun prix gradé',()=>{const result=getGradingInterest({rawPrice:150,rarity:'Secret',trend:120,avg30:100});expect(result.level).toBe('high');expect(result.hasRealGradedData).toBe(false)});it('explique un intérêt faible',()=>expect(getGradingInterest({rawPrice:2}).reasons).toHaveLength(1))})
