import {estimateTarget} from './gaze.mjs';
export const PROFILES={balanced:{yaw:28,pitch:22,eyeX:.28,eyeY:.24,confirm:350},gentle:{yaw:34,pitch:28,eyeX:.36,eyeY:.32,confirm:450},strict:{yaw:24,pitch:20,eyeX:.22,eyeY:.20,confirm:250}};
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
const lerp=(a,b,amount)=>a+(b-a)*amount;
export function newAttention(){return {focused:true,reason:'Steady focus',last:null,lastFace:null,missingSince:null,closedSince:null,pending:null,pendingSince:0,pose:null,history:[],target:null,screen:null,screenHistory:[]};}
/** One bounded, time-based filter shared by scoring, reactions and pursuit. */
export function observeAttention(state,o,baseline,now,profile='balanced'){
 if(!Number.isFinite(now)||o.face&&(!Number.isFinite(o.yaw)||!Number.isFinite(o.pitch)))return null;
 const settings=PROFILES[profile]||PROFILES.balanced;
 const gap=state.last===null?0:now-state.last;
 if(gap>1000){state.history=[];state.pose=null;state.target=null;state.screen=null;state.screenHistory=[];state.pending=null;state.closedSince=null;state.missingSince=null;}
 const dt=Math.min(250,Math.max(0,gap));state.last=now;
 let candidateAway=false,cause='Steady focus';
 if(!o.face){
  state.missingSince??=now;
  if(now-state.missingSince>=250){candidateAway=true;cause='Face not visible';state.target=null;}
  else candidateAway=!state.focused;
 }else{
  state.missingSince=null;state.lastFace=now;
  const blinking=(o.blinkStrength||0)>.6;
  if(blinking)state.closedSince??=now;else state.closedSince=null;
  const eyeAvailable=!blinking&&Number.isFinite(o.gazeX)&&Number.isFinite(o.gazeY);
  const sample={yaw:o.yaw,pitch:o.pitch,gazeX:eyeAvailable?o.gazeX:(state.pose?.gazeX??baseline.gazeX??0),gazeY:eyeAvailable?o.gazeY:(state.pose?.gazeY??baseline.gazeY??0)};
  state.history.push(sample);if(state.history.length>5)state.history.shift();
  const middle=Object.fromEntries(Object.keys(sample).map(key=>[key,median(state.history.map(p=>p[key]))]));
  if(!state.pose)state.pose=middle;
  else{const alpha=1-Math.exp(-dt/150);for(const key of Object.keys(middle))state.pose[key]=lerp(state.pose[key],middle[key],alpha);}
  const p=state.pose,headScale=state.focused?1:.72,eyeScale=state.focused?1:.65;
  const headAway=Math.abs(p.yaw-baseline.yaw)>settings.yaw*headScale||Math.abs(p.pitch-baseline.pitch)>settings.pitch*headScale;
  // Use calibrated binocular direction, not a noisy single expression coefficient.
  const directional=Number.isFinite(o.gazeX)&&Number.isFinite(o.gazeY);
  const mapped=o.screenPoint&&Number.isFinite(o.screenPoint.x)&&Number.isFinite(o.screenPoint.y);
  if(mapped&&!blinking){
   state.screenHistory.push(o.screenPoint);if(state.screenHistory.length>5)state.screenHistory.shift();
   const middle={x:median(state.screenHistory.map(p=>p.x)),y:median(state.screenHistory.map(p=>p.y))};
   if(!state.screen)state.screen=middle;else{const a=1-Math.exp(-dt/180);state.screen={x:lerp(state.screen.x,middle.x,a),y:lerp(state.screen.y,middle.y,a)};}
  }
  const margin=state.focused?.1:.025;
  const eyesAway=mapped&&state.screen?(state.screen.x < -margin||state.screen.x>1+margin||state.screen.y < -margin||state.screen.y>1+margin):directional?(Math.abs(p.gazeX-(baseline.gazeX||0))>settings.eyeX*eyeScale||Math.abs(p.gazeY-(baseline.gazeY||0))>settings.eyeY*eyeScale):blinking?(!state.focused&&state.reason.startsWith('Eyes')):!!o.gaze;
  const closed=state.closedSince!==null&&now-state.closedSince>=800;
  candidateAway=headAway||eyesAway||closed;cause=headAway?'Head turned away':closed?'Eyes closed':eyesAway?'Eyes looking away':'Steady focus';
  const rawTarget=mapped&&state.screen?{x:Math.max(0,Math.min(1,state.screen.x)),y:Math.max(0,Math.min(1,state.screen.y))}:estimateTarget({...p,face:true},baseline);
  if(!state.target)state.target=rawTarget;
  else if(Math.hypot(rawTarget.x-state.target.x,rawTarget.y-state.target.y)>.025){const a=1-Math.exp(-dt/300);state.target={x:lerp(state.target.x,rawTarget.x,a),y:lerp(state.target.y,rawTarget.y,a)};}
 }
 const desired=!candidateAway;
 if(desired===state.focused)state.pending=null;
 else if(state.pending!==desired){state.pending=desired;state.pendingSince=now;}
 else if(now-state.pendingSince>=(desired?250:settings.confirm)){state.focused=desired;state.reason=desired?'Steady focus':cause;state.pending=null;}
 const pose=state.pose?{...state.pose,face:state.lastFace!==null&&now-state.lastFace<=250,gaze:!state.focused&&state.reason.startsWith('Eyes')}:{yaw:0,pitch:0,gazeX:0,gazeY:0,face:false,gaze:false};
 return {focused:state.focused,reason:state.pending===false?'Checking attention...':state.reason,target:state.target?{...state.target}:null,pose};
}
