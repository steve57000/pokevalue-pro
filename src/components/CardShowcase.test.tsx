import {describe,expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {CardFaces,cardTransform,dragOffset,nudgeTilt} from './CardShowcase'
describe('CardShowcase rotation',()=>{
 it('calcule un drag temporaire borné',()=>{expect(dragOffset({x:10,y:10},{x:110,y:50})).toEqual({x:-14,y:35});expect(dragOffset({x:0,y:0},{x:1000,y:-1000})).toEqual({x:36,y:36})})
 it('modifie indépendamment l’inclinaison stable avec les quatre flèches',()=>{let tilt={x:0,y:0};tilt=nudgeTilt(tilt,'up');tilt=nudgeTilt(tilt,'right');expect(tilt).toEqual({x:-7,y:7});expect(nudgeTilt(tilt,'down')).toEqual({x:0,y:7});expect(nudgeTilt(tilt,'left')).toEqual({x:-7,y:0})})
 it('combine côté, base et drag sans polluer le verso',()=>{expect(cardTransform({x:7,y:-7},{x:2,y:3},'back')).toBe('rotateX(9deg) rotateY(176deg)');expect(cardTransform({x:7,y:-7},{x:0,y:0},'front')).toBe('rotateX(7deg) rotateY(-7deg)')})
 it('revient exactement au recto à 0° et 360°',()=>{expect(cardTransform({x:0,y:0},{x:0,y:0},'front')).toBe('rotateX(0deg) rotateY(0deg)');expect(cardTransform({x:0,y:360},{x:0,y:0},'front')).toBe('rotateX(0deg) rotateY(360deg)')})
 it('sépare strictement le composant de recto et l’image du verso',()=>{const html=renderToStaticMarkup(<CardFaces card={{id:'set-1',name:'Pikachu',localId:'1',image:'https://assets.example/front'}}/>);const front=html.match(/<div class="showcase-face showcase-front">([\s\S]*?)<\/div><div class="showcase-face showcase-back">/)?.[1];expect(front).toContain('class="catalogue-image');expect(front).not.toContain('pokemon-card-back.jpg');expect(html.match(/pokemon-card-back\.jpg/g)).toHaveLength(1);expect(html).toContain('<div class="showcase-face showcase-back"><img src="/images/pokemon-card-back.jpg"')})
})
