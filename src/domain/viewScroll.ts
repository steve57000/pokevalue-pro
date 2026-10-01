export type ViewScrollState<T extends string> = Record<T,number>
export function changeViewScroll<T extends string>(state:ViewScrollState<T>,current:T,next:T,currentY:number){return {state:{...state,[current]:currentY},restoreY:state[next]??0}}
