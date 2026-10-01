import {describe,expect,it} from 'vitest'
import {changeViewScroll} from './viewScroll'
describe('scroll par vue',()=>{it('sauvegarde la vue quittée et restaure uniquement la vue cible',()=>{const result=changeViewScroll({collection:120,scanner:44},'collection','scanner',310);expect(result.state).toEqual({collection:310,scanner:44});expect(result.restoreY).toBe(44)})})
