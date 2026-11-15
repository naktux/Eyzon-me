export type Motion={x:number;y:number;vx:number;vy:number};
export function urgency(score:number):number;
export function stepMotion(state:Motion,target:{x:number;y:number},seconds:number,maxSpeed:number):Motion;
export function normalizePoint(x:number,y:number,width:number,height:number,size:number):{x:number;y:number};
