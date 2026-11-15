export function urgency(score) { return .2 + .8 * Math.max(0, Math.min(1, (80-score)/60)); }
export function stepThrow(state,seconds,width,height,size){
 let {x,y,vx,vy}=state;
 const dt=Math.max(0,Math.min(.05,seconds)),right=Math.max(12,width-size-12),floor=Math.max(12,height-size-12);
 vx*=Math.exp(-1.8*dt);vy+=1100*dt;x+=vx*dt;y+=vy*dt;
 if(x<12){x=12;vx=Math.abs(vx)*.55;}else if(x>right){x=right;vx=-Math.abs(vx)*.55;}
 if(y<12){y=12;vy=Math.abs(vy)*.5;}
 if(y>=floor){y=floor;vy=Math.abs(vy)<85?0:-Math.abs(vy)*.48;vx*=Math.exp(-8*dt);}
 if(y===floor&&vy===0&&Math.abs(vx)<8)vx=0;
 return {x,y,vx,vy};
}
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
