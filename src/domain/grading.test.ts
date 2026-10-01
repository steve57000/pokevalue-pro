import {describe,expect,it} from 'vitest'
import {getGradingInterest} from './grading'
describe('gradation',()=>{it('reste heuristique et ne fabrique aucun prix gradé',()=>{const result=getGradingInterest({rawPrice:150,rarity:'Secret',trend:120,avg30:100});expect(result.level).toBe('high');expect(result.hasRealGradedData).toBe(false)});it('explique un intérêt faible',()=>expect(getGradingInterest({rawPrice:2}).reasons).toHaveLength(1))})

describe('tri des signaux de gradation',()=>{it('combine tendance courte, rareté, prix et ancienneté sans présenter le score comme une probabilité',()=>{const result=getGradingInterest({rawPrice:80,rarity:'Illustration Rare',trend:90,avg7:88,avg30:70,low:50,year:2005});expect(result.level).toBe('high');expect(result.score).toBeGreaterThanOrEqual(65);expect(result.reasons.length).toBeGreaterThan(3)})})
