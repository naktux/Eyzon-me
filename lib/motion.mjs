export function urgency(score) { return .2 + .8 * Math.max(0, Math.min(1, (80-score)/60)); }
export function stepMotion(state, target, seconds, maxSpeed) {
 const dt = Math.max(0, Math.min(.05, seconds));
 const dx=target.x-state.x,dy=target.y-state.y,dist=Math.hypot(dx,dy);
 if(dist<.35 && Math.hypot(state.vx,state.vy)<4)return {x:target.x,y:target.y,vx:0,vy:0};
 const speed=Math.min(maxSpeed,dist*7),blend=1-Math.exp(-10*dt);
 const vx=state.vx+((dist?dx/dist*speed:0)-state.vx)*blend;
 const vy=state.vy+((dist?dy/dist*speed:0)-state.vy)*blend;
 const nx=state.x+vx*dt,ny=state.y+vy*dt;
 if(dist>0&&(target.x-nx)*dx+(target.y-ny)*dy<0)return {x:target.x,y:target.y,vx:0,vy:0};
 return {x:nx,y:ny,vx,vy};
}
export function normalizePoint(x,y,width,height,size) {
 return {x:Math.max(0,Math.min(1,(x-size/2-12)/Math.max(1,width-size-24))),y:Math.max(0,Math.min(1,(y-size/2-12)/Math.max(1,height-size-24)))};
}
