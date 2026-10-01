export interface GradedPriceProvider { readonly name:string; getPrices(cardId:string, language:string):Promise<readonly never[]> }
export type GradingInterest={level:'high'|'medium'|'low';reasons:string[];hasRealGradedData:boolean}
export function getGradingInterest(input:{rawPrice?:number;rarity?:string;trend?:number;avg30?:number}):GradingInterest{
  const reasons:string[]=[]; let score=0
  if((input.rawPrice??0)>=100){score+=2;reasons.push('Valeur brute élevée (au moins 100 €)')}
  else if((input.rawPrice??0)>=30){score++;reasons.push('Valeur brute notable (au moins 30 €)')}
  if(/secret|illustration|ultra|rare|shiny/i.test(input.rarity??'')){score++;reasons.push(`Rareté déclarée : ${input.rarity}`)}
  if(input.trend&&input.avg30&&input.trend>input.avg30*1.05){score++;reasons.push('Tendance supérieure de plus de 5 % à la moyenne 30 jours')}
  if(!reasons.length)reasons.push('Aucun signal de marché suffisant avec les données disponibles')
  return {level:score>=3?'high':score>=1?'medium':'low',reasons,hasRealGradedData:false}
}
