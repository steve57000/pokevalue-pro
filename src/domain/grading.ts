export type GradedPrice={company:'PSA'|'BGS'|'CGC';grade:string;value:number;currency:string;source:string;updatedAt?:string}
export interface GradedPriceProvider {readonly id:string;supportsLanguage(language:string):boolean;getPrices(cardId:string,language:string):Promise<readonly GradedPrice[]>}
export type GradingInterest={level:'high'|'medium'|'low';score:number;reasons:string[];hasRealGradedData:boolean}
export function getGradingInterest(input:{rawPrice?:number;rarity?:string;trend?:number;avg30?:number;avg7?:number;low?:number;year?:number;gradedPrices?:readonly GradedPrice[]}):GradingInterest{
 const reasons:string[]=[];let score=0
 const raw=input.rawPrice??0
 if(raw>=100){score+=38;reasons.push('Prix brut élevé (au moins 100 €)')}else if(raw>=50){score+=28;reasons.push('Prix brut notable (au moins 50 €)')}else if(raw>=20){score+=16;reasons.push('Prix brut significatif (au moins 20 €)')}
 if(/secret|illustration|ultra|shiny|hyper|gold|rare/i.test(input.rarity??'')){score+=22;reasons.push(`Rareté déclarée : ${input.rarity}`)}
 if(input.trend&&input.avg30){const delta=(input.trend-input.avg30)/input.avg30;if(delta>=.1){score+=18;reasons.push('Tendance au moins 10 % au-dessus de la moyenne 30 jours')}else if(delta>=.05){score+=10;reasons.push('Tendance supérieure à la moyenne 30 jours')}else if(delta<-.1){score-=8;reasons.push('Tendance inférieure à la moyenne 30 jours')}}
 if(input.avg7&&input.avg30&&input.avg7>input.avg30*1.05){score+=10;reasons.push('Moyenne 7 jours en progression face aux 30 jours')}
 if(input.low&&input.trend&&input.trend>input.low*1.3){score+=6;reasons.push('Écart marqué entre prix bas et tendance')}
 if(input.year&&new Date().getFullYear()-input.year>=15){score+=12;reasons.push('Carte ancienne (au moins 15 ans)')}
 score=Math.max(0,Math.min(100,score));if(!reasons.length)reasons.push('Aucun signal de marché suffisant avec les données disponibles')
 return {level:score>=65?'high':score>=25?'medium':'low',score,reasons,hasRealGradedData:Boolean(input.gradedPrices?.length)}
}
