import {createRoot,type Root} from "react-dom/client";
import PetCompanion from "../components/PetCompanion";
import styles from "../components/pet.css?inline";
import {normalizePoint,stepMotion,urgency,type Motion} from "../lib/motion.mjs";
import {EMPTY,STALE_MS,type BrokerMessage,type Snapshot} from "./protocol";
import {viewportSpace,mapScreenPoint} from '../lib/screen-gaze.mjs';
const HOST_ID="slopify-focus-pet-root";
if(!document.getElementById(HOST_ID))setup();
function setup(){
 const host=document.createElement("div");host.id=HOST_ID;
 host.style.cssText="all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important;";
 const shadow=host.attachShadow({mode:"closed"});
 const sheet=new CSSStyleSheet();sheet.replaceSync(styles+`:host{all:initial}.pet-dock{position:fixed;top:0;left:0;width:176px;pointer-events:auto;cursor:grab;touch-action:none;outline:none;will-change:transform}.pet-overlay{width:100%}.pet-dock:focus-visible{outline:2px solid #75875e;border-radius:8px}.pet-dock.dragging{cursor:grabbing}.pet-dock.dragging *{animation-play-state:paused!important}.pet-dock .pet-speech{transform:translateX(calc(-50% + var(--bubble-shift,0px)))}.pet-dock[data-bubble-below=true] .pet-speech{bottom:auto;top:calc(100% + 8px)}.pet-dock[data-bubble-below=true] .pet-speech:after{bottom:auto;top:-8px;rotate:225deg}`);
 shadow.adoptedStyleSheets=[sheet];
 const dock=document.createElement("div");dock.className="pet-dock";dock.tabIndex=0;
 dock.setAttribute("role","group");dock.setAttribute("aria-label","Eyzon. Drag to set its resting spot, or use arrow keys.");shadow.append(dock);
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 let root:Root|undefined,snapshot:Snapshot={...EMPTY},port:chrome.runtime.Port|undefined,reconnect:ReturnType<typeof setTimeout>|undefined;
 let dragging=false,destroyed=false,renderKey="",frame=0,lastFrame=0,placed=false,dragUntil=0;
 let resumeChase:ReturnType<typeof setTimeout>|undefined;
 let zoom=1;
 const refreshZoom=()=>{try{void chrome.runtime.sendMessage({type:'getViewportZoom'}).then(value=>{if(Number.isFinite(value)&&value>0){zoom=value;paint();}}).catch(()=>{});}catch{/* Extension may have been reloaded. */}};
 let motion:Motion={x:0,y:0,vx:0,vy:0},destination={x:0,y:0};
 const size=()=>Math.max(48,Math.min(176,innerWidth-24,innerHeight-24));
 const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
 const home=()=>({x:12+snapshot.position*Math.max(0,innerWidth-size()-24),y:12+snapshot.positionY*Math.max(0,innerHeight-size()-24)});
 function apply(){
  motion.x=clamp(motion.x,12,Math.max(12,innerWidth-size()-12));motion.y=clamp(motion.y,12,Math.max(12,innerHeight-size()-12));
  dock.style.width=`${size()}px`;dock.style.transform=`translate3d(${motion.x.toFixed(2)}px,${motion.y.toFixed(2)}px,0)`;
  dock.dataset.running=String(!dragging&&snapshot.mood!=="fainted"&&Math.hypot(motion.vx,motion.vy)>12);
  if(Math.abs(motion.vx)>12)dock.dataset.direction=motion.vx<0?"-1":"1";
  dock.dataset.bubbleBelow=String(motion.y<160);
  const center=motion.x+size()/2,half=Math.min(110,(innerWidth-28)/2);
  dock.style.setProperty("--bubble-shift",`${clamp(center,half+12,innerWidth-half-12)-center}px`);
 }
 function tick(now:number){
  frame=0;if(dragging||!host.isConnected||document.hidden)return;
  const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):1/60;lastFrame=now;
  motion=stepMotion(motion,destination,dt,220+urgency(snapshot.score)*430);apply();
  if(Math.hypot(destination.x-motion.x,destination.y-motion.y)>.4||Math.hypot(motion.vx,motion.vy)>1)frame=requestAnimationFrame(tick);
  else{motion={...motion,vx:0,vy:0};dock.dataset.running="false";lastFrame=0;}
 }
 function aim(){
  if(dragging)return;
  if(!placed){motion={...home(),vx:0,vy:0};placed=true;}
  const chasing=snapshot.distracted&&snapshot.mood!=="fainted"&&snapshot.target&&performance.now()>dragUntil;
  if(snapshot.mood==="fainted"){destination={x:motion.x,y:motion.y};motion.vx=motion.vy=0;}
  else if(chasing&&!reduced.matches){const viewport=viewportSpace(window,zoom),point=mapScreenPoint(snapshot.target!,snapshot.space,{...viewport,dpr:devicePixelRatio||1});destination={x:clamp(point.x-size()/2,12,Math.max(12,innerWidth-size()-12)),y:clamp(point.y-size()/2,12,Math.max(12,innerHeight-size()-12))};}
  else if(snapshot.distracted&&!snapshot.target&&!reduced.matches){destination={x:motion.x,y:motion.y};}
  else destination=home();
  if(reduced.matches){cancelAnimationFrame(frame);frame=0;motion={...home(),vx:0,vy:0};apply();return;}
  apply();if(!frame){lastFrame=0;frame=requestAnimationFrame(tick);}
 }
 function paint(){
  if(!snapshot.running||Date.now()-snapshot.updatedAt>=STALE_MS||document.hidden){cancelAnimationFrame(frame);frame=0;root?.unmount();root=undefined;host.remove();renderKey="";return;}
  if(!host.isConnected)document.documentElement.append(host);
  host.dataset.petMood=snapshot.mood;host.dataset.distracted=String(snapshot.distracted);
  if(!root)root=createRoot(dock);
  const reaction=snapshot.reaction&&snapshot.reaction.expiresAt>Date.now()?snapshot.reaction:null;
  const key=[snapshot.mood,snapshot.distracted,Math.floor(snapshot.score/5),reaction?.id].join(":");
  if(key!==renderKey){root.render(<PetCompanion mood={snapshot.mood} score={snapshot.score} distracted={snapshot.distracted} reaction={reaction} overlay/>);renderKey=key;}
  aim();
 }
 const post=(message:unknown)=>{try{port?.postMessage(message);}catch{/* Reconnect below. */}};
 function accept(value:Snapshot){snapshot={...EMPTY,...value,position:dragging?snapshot.position:value.position,positionY:dragging?snapshot.positionY:(value.positionY??1)};paint();}
 function connect(){
  if(destroyed)return;
  try{port=chrome.runtime.connect({name:"pet"});port.onMessage.addListener((m:BrokerMessage)=>{if(m.type==="snapshot")accept(m.snapshot);});port.onDisconnect.addListener(()=>{port=undefined;if(chrome.runtime.id&&!destroyed)reconnect=setTimeout(connect,1000);else{destroyed=true;clearInterval(watchdog);snapshot.running=false;paint();}});post({type:"visible",visible:!document.hidden});refreshZoom();}
  catch{destroyed=true;snapshot.running=false;paint();clearInterval(watchdog);}
 }
 function saveHome(){const point=normalizePoint(motion.x+size()/2,motion.y+size()/2,innerWidth,innerHeight,size());snapshot.position=point.x;snapshot.positionY=point.y;post({type:"position",position:point.x,positionY:point.y});dragUntil=performance.now()+1800;clearTimeout(resumeChase);resumeChase=setTimeout(paint,1850);}
 let grab={x:0,y:0};
 dock.addEventListener("pointerdown",event=>{if(event.button!==0)return;dragging=true;cancelAnimationFrame(frame);frame=0;motion.vx=motion.vy=0;grab={x:event.clientX-motion.x,y:event.clientY-motion.y};dock.classList.add("dragging");dock.setPointerCapture(event.pointerId);event.preventDefault();});
 dock.addEventListener("pointermove",event=>{if(!dragging)return;motion.x=event.clientX-grab.x;motion.y=event.clientY-grab.y;apply();});
 const finish=()=>{if(!dragging)return;dragging=false;dock.classList.remove("dragging");saveHome();};dock.addEventListener("pointerup",finish);dock.addEventListener("pointercancel",finish);
 dock.addEventListener("keydown",event=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;event.preventDefault();motion.x+=event.key==="ArrowLeft"?-24:event.key==="ArrowRight"?24:0;motion.y+=event.key==="ArrowUp"?-24:event.key==="ArrowDown"?24:0;motion.vx=motion.vy=0;apply();saveHome();});
 window.addEventListener("resize",refreshZoom);reduced.addEventListener("change",paint);
 document.addEventListener("visibilitychange",()=>{post({type:"visible",visible:!document.hidden});paint();});
 const poll=()=>{if(document.hidden||destroyed)return;try{chrome.runtime.sendMessage({type:"getSnapshot"}).then(value=>{if(value)accept(value);}).catch(()=>{snapshot.running=false;paint();});}catch{snapshot.running=false;paint();}};
 let watchdog=setInterval(poll,2000);
 window.addEventListener("pagehide",()=>{destroyed=true;clearInterval(watchdog);clearTimeout(reconnect);clearTimeout(resumeChase);cancelAnimationFrame(frame);frame=0;port?.disconnect();root?.unmount();root=undefined;renderKey="";host.remove();});
 window.addEventListener("pageshow",event=>{if(event.persisted){destroyed=false;watchdog=setInterval(poll,2000);connect();}});
 connect();
}
