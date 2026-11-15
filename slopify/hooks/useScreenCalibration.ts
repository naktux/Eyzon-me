import {useCallback,useEffect,useRef,useState} from 'react';
import type {Observation} from '../components/FocusTracker';
import {TRAIN_POINTS,CHECK_POINTS,validSample,summarize,fitScreen,checkAccuracy,viewportSpace,type CalibrationPoint,type ScreenModel,type Space,type Accuracy} from '../lib/screen-gaze.mjs';
type Phase='closed'|'intro'|'training'|'checking'|'result';
type View={phase:Phase;index:number;capturing:boolean;progress:number;message:string;accuracy:Accuracy|null;fullscreen:boolean};
const INITIAL:View={phase:'closed',index:0,capturing:false,progress:0,message:'',accuracy:null,fullscreen:false};
export function useScreenCalibration(onCommit:(model:ScreenModel,space:Space,accuracy:Accuracy)=>void){
 const [view,setView]=useState<View>(INITIAL),current=useRef(INITIAL);
 const data=useRef<{points:CalibrationPoint[];checks:CalibrationPoint[];model:ScreenModel|null;space:Space|null;width:number;height:number;display:{x:number;y:number;dpr:number};samples:Observation[];armed:number;last:number;dwell:number}>({points:[],checks:[],model:null,space:null,width:0,height:0,display:{x:0,y:0,dpr:1},samples:[],armed:0,last:0,dwell:0});
 const update=useCallback((patch:Partial<View>)=>{current.current={...current.current,...patch};setView(current.current);},[]);
 const exit=useCallback(()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});},[]);
 const cancel=useCallback(()=>{update(INITIAL);data.current.samples=[];data.current.model=null;exit();},[exit,update]);
 const open=useCallback(()=>{update({...INITIAL,phase:'intro'});},[update]);
 const begin=useCallback(async()=>{
  // Called by an explicit click; camera and inference continue in the same tab.
  let fullscreen=!!document.fullscreenElement;
  if(!fullscreen)try{await document.documentElement.requestFullscreen();fullscreen=true;}catch{/* Window calibration remains available. */}
  // Fullscreen can resolve before the final viewport resize is painted.
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  let zoom=1;
  try{const tab=await chrome.tabs.getCurrent();if(tab?.id!==undefined)zoom=await chrome.tabs.getZoom(tab.id);}catch{/* Normal browser preview uses zoom 1. */}
  if(current.current.phase==='closed'){exit();return;}
  data.current={points:[],checks:[],model:null,space:viewportSpace(window,zoom),width:innerWidth,height:innerHeight,display:{x:screenX,y:screenY,dpr:devicePixelRatio},samples:[],armed:0,last:0,dwell:0};
  update({...INITIAL,phase:'training',fullscreen,message:'Look at the dot. Press Space or click it when ready.'});
 },[exit,update]);
 const arm=useCallback(()=>{
  if(!['training','checking'].includes(current.current.phase)||current.current.capturing)return;
  Object.assign(data.current,{armed:performance.now(),last:0,dwell:0,samples:[]});
  update({capturing:true,progress:0,message:'Keep looking at the dot. Hold your head comfortably still.'});
 },[update]);
 const sample=useCallback((o:Observation,now:number)=>{
  const v=current.current,d=data.current;if(!v.capturing)return;
  if(document.hidden){d.samples=[];d.dwell=0;d.last=0;update({progress:0,message:'Return to this calibration tab to continue.'});return;}
  if(now-d.armed<450)return; // Let the eye settle before gathering evidence.
  if(!validSample(o)){
   // A blink pauses capture; face loss or a longer gap discards the partial point.
   if(!o.face||d.last&&now-d.last>350){d.samples=[];d.dwell=0;}
   update({progress:d.dwell/900,message:!o.face?'Face not visible. Face the camera to continue.':(o.blinkStrength||0)>=.55?'Blink detected. Keep looking at the dot.':'Eyes are not clear enough. Face the camera with even lighting.'});return;
  }
  if(d.last&&now-d.last>350){d.samples=[];d.dwell=0;}
  d.dwell+=d.last?Math.min(120,now-d.last):0;d.last=now;
  d.samples.push(o);if(d.samples.length>30)d.samples.shift();
  update({progress:Math.min(1,d.dwell/900),message:'Collecting eye positions…'});
  if(d.dwell<900||d.samples.length<8)return;
  const points=v.phase==='training'?TRAIN_POINTS:CHECK_POINTS;
  const point=summarize(d.samples,points[v.index]);
  if(v.phase==='training')d.points.push(point);else d.checks.push(point);
  d.samples=[];
  if(v.index<points.length-1){update({index:v.index+1,capturing:false,progress:0,message:'Next dot. Look first, then press Space.'});return;}
  if(v.phase==='training'){
   d.model=fitScreen(d.points);
   if(!d.model){update({phase:'result',capturing:false,accuracy:null,message:'Not enough distinct eye movement to learn a screen map. Try brighter, even lighting and keep your head still.'});return;}
   update({phase:'checking',index:0,capturing:false,progress:0,message:'Now check five fresh points. These were not used to train the map.'});return;
  }
  const accuracy=checkAccuracy(d.model!,d.checks,d.width,d.height);
  update({phase:'result',capturing:false,accuracy,message:accuracy.usable?'Your screen map is ready. Webcam gaze remains approximate.':'This map is too imprecise to use. Adjust your camera or lighting and try again.'});
 },[update]);
 const accept=()=>{
  const d=data.current,v=current.current;
  if(d.model&&d.space&&v.accuracy?.usable){onCommit(d.model,d.space,v.accuracy);cancel();}
 };
 useEffect(()=>{
  const changed=()=>{
   const v=current.current,d=data.current;
   if(['training','checking','result'].includes(v.phase)&&(Math.abs(innerWidth-d.width)>4||Math.abs(innerHeight-d.height)>4||screenX!==d.display.x||screenY!==d.display.y||devicePixelRatio!==d.display.dpr))cancel();
  };
  const full=()=>{if(current.current.fullscreen&&!document.fullscreenElement)cancel();};
  window.addEventListener('resize',changed);document.addEventListener('fullscreenchange',full);
  const timer=['training','checking','result'].includes(view.phase)?setInterval(changed,250):undefined;
  return()=>{clearInterval(timer);window.removeEventListener('resize',changed);document.removeEventListener('fullscreenchange',full);};
 },[cancel,view.phase]);
 return {...view,open,begin,cancel,arm,sample,accept,point:(view.phase==='checking'?CHECK_POINTS:TRAIN_POINTS)[view.index],total:view.phase==='checking'?5:9};
}
