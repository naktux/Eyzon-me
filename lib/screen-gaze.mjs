import {Matrix, solve} from 'ml-matrix';
export const TRAIN_POINTS=[{x:.06,y:.06},{x:.94,y:.06},{x:.94,y:.94},{x:.06,y:.94},{x:.5,y:.5}];
export const CHECK_POINTS=[{x:.25,y:.25},{x:.75,y:.75}];
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
/** Iris positions expressed in each eye's own axes; no image crops or second model. */
export function eyeFeatures(points,yaw,pitch,gaze){
 if(!points?.[473])return null;
 const eye=(a,b,c)=>{
  const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
  if(length<1e-7)return null;
  const x=c.x-(a.x+b.x)/2,y=c.y-(a.y+b.y)/2;
  return [(x*dx+y*dy)/length,(y*dx-x*dy)/length];
 };
 const left=eye(points[33],points[133],points[468]),right=eye(points[362],points[263],points[473]);
 if(!left||!right)return null;
 const f=[...left,...right,gaze.x,gaze.y,yaw/45,pitch/35];
 return f.every(Number.isFinite)?f:null;
}
export function validSample(o){return o.face&&(o.blinkStrength||0)<.55&&Array.isArray(o.screenFeatures)&&o.screenFeatures.length===8&&o.screenFeatures.every(Number.isFinite)&&Number.isFinite(o.yaw)&&Number.isFinite(o.pitch);}
export function summarize(samples,target){
 return {target,features:Array.from({length:8},(_,i)=>median(samples.map(s=>s.screenFeatures[i]))),baseline:Object.fromEntries(['yaw','pitch','gazeX','gazeY'].map(k=>[k,median(samples.map(s=>s[k]||0))]))};
}
/** Small regularized, standardized local fit. Only point medians are retained. */
export function fitScreen(points){
 if(points.length!==TRAIN_POINTS.length)return null;
 const mean=Array.from({length:8},(_,i)=>points.reduce((n,p)=>n+p.features[i],0)/points.length);
 const scale=mean.map((m,i)=>Math.sqrt(points.reduce((n,p)=>n+(p.features[i]-m)**2,0)/points.length));
 // A stationary eye/blank camera cannot learn a meaningful screen map.
 if(!scale.every(Number.isFinite)||Math.max(...scale.slice(0,4))<.008)return null;
 const divisors=scale.map(s=>Math.max(.003,s));
 const rows=points.map(p=>[1,...p.features.map((v,i)=>(v-mean[i])/divisors[i])]);
 try{
  const x=new Matrix(rows),t=new Matrix(points.map(p=>[p.target.x,p.target.y])),xt=x.transpose();
  const gram=xt.mmul(x);for(let i=1;i<gram.rows;i++)gram.set(i,i,gram.get(i,i)+.8);
  const weights=solve(gram,xt.mmul(t)).to2DArray();
  return weights.flat().every(Number.isFinite)?{mean,scale:divisors,weights,baseline:points.at(-1).baseline}:null;
 }catch{return null;}
}
export function predictScreen(model,features){
 if(!model||features?.length!==8||!features.every(Number.isFinite))return null;
 const row=[1,...features.map((v,i)=>(v-model.mean[i])/model.scale[i])];
 const p={x:row.reduce((s,v,i)=>s+v*model.weights[i][0],0),y:row.reduce((s,v,i)=>s+v*model.weights[i][1],0)};
 return Number.isFinite(p.x)&&Number.isFinite(p.y)?p:null; // Keep extrapolation for off-screen decisions.
}
export function checkAccuracy(model,checks,width,height){
 const deltas=checks.map(p=>{const q=predictScreen(model,p.features);return q?{x:Math.abs(q.x-p.target.x),y:Math.abs(q.y-p.target.y)}:{x:Infinity,y:Infinity};});
 const errors=deltas.map(p=>Math.hypot(p.x*width,p.y*height)).sort((a,b)=>a-b);
 const mean=errors.reduce((a,b)=>a+b,0)/errors.length,max=errors.at(-1)??Infinity,diagonal=Math.hypot(width,height);
 const axisError=key=>deltas.reduce((sum,p)=>sum+p[key],0)/deltas.length;
 return {mean,max,usable:checks.length===CHECK_POINTS.length&&Number.isFinite(mean)&&mean<diagonal*.12&&max<diagonal*.22&&axisError('x')<.14&&axisError('y')<.14};
}
/** Physical display-pixel bounds allow calibration to survive normal window resizing/zoom. */
export function viewportSpace(w,zoom=1){
 const safeZoom=Number.isFinite(zoom)&&zoom>0?zoom:1,dpr=w.devicePixelRatio||1,hardware=dpr/safeZoom;
 const border=Math.max(0,(w.outerWidth-w.innerWidth*safeZoom)/2);
 return {left:(w.screenX+border)*hardware,top:(w.screenY+Math.max(0,w.outerHeight-w.innerHeight*safeZoom-border))*hardware,width:w.innerWidth*dpr,height:w.innerHeight*dpr};
}
export function mapScreenPoint(point,space,viewport){
 if(!space)return {x:point.x*viewport.width,y:point.y*viewport.height};
 return {x:(space.left+point.x*space.width-viewport.left)/viewport.dpr,y:(space.top+point.y*space.height-viewport.top)/viewport.dpr};
}
