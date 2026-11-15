import {useEffect,useRef} from 'react';
import type {useScreenCalibration} from '../hooks/useScreenCalibration';
export default function ScreenCalibration({calibration:c}:{calibration:ReturnType<typeof useScreenCalibration>}){
 const dialog=useRef<HTMLDivElement>(null),previous=useRef<HTMLElement|null>(null);
 const open=c.phase!=='closed';
 const {cancel,arm}=c;
 useEffect(()=>{
  if(!open)return;previous.current=document.activeElement as HTMLElement;
  dialog.current?.focus();return()=>{previous.current?.focus();};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();cancel();}
   if(e.code==='Space'&&(e.target===dialog.current||e.target===document.body)){e.preventDefault();arm();}
   if(e.key==='Tab'){
    const buttons=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
 },[open,cancel,arm]);
 if(!open)return null;
 const measuring=c.phase==='training'||c.phase==='checking';
 return <div className="screen-calibration" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Screen gaze calibration">
  <button className={'calibration-cancel '+(measuring?'':'calibration-cancel-card')} onClick={c.cancel}>Cancel · Esc</button>
  {c.phase==='intro'&&<div className="calibration-card"><p className="eyebrow">MAKE YOURSELF COMFORTABLE</p><h2>Let’s learn where you look.</h2><p>Look at four corners, four edges, then the center. Keep your head in a comfortable, steady position and move your eyes to each dot.</p><p>Press <kbd>Space</kbd> or click the dot when you are looking at it. We’ll check five fresh points afterward.</p><p>Use your main screen with even lighting. Calibration stays in memory for this camera session.</p><button className="primary" onClick={()=>void c.begin()}>Begin full-screen calibration</button><small>If full screen is unavailable, we calibrate this window. A session pauses during calibration.</small></div>}
  {measuring&&<><div className="calibration-instructions"><p className="eyebrow">{c.phase==='training'?'LEARNING YOUR SCREEN':'CHECKING ACCURACY'} · {c.index+1} / {c.total}</p><h2>{c.capturing?'Hold your gaze here.':'Look at the dot.'}</h2><p role="status">{c.message}</p><small>{c.fullscreen?'Full-screen calibration':'Window calibration'} · Keep your head still · Space or click to collect</small></div><button key={`${c.phase}-${c.index}`} className={'calibration-dot '+(c.capturing?'collecting':'')} aria-label={`Collect gaze point ${c.index+1}`} data-calibration-x={c.point.x} data-calibration-y={c.point.y} style={{left:`${c.point.x*100}%`,top:`${c.point.y*100}%`}} onClick={c.arm} aria-disabled={c.capturing}><span/><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" pathLength="1" strokeDasharray={`${c.progress} 1`}/></svg></button></>}
  {c.phase==='result'&&<div className="calibration-card"><p className="eyebrow">CALIBRATION CHECK</p><h2>{c.accuracy?.usable?'A little more in tune.':'Let’s try that again.'}</h2><p role="status">{c.message}</p>{c.accuracy&&<div className="accuracy-result"><strong>{Math.round(c.accuracy.mean)} px</strong><span>Average error across five check points<br/>Largest error: {Math.round(c.accuracy.max)} px</span></div>}<p>This is an estimate, not a precise cursor. Recalibrate if you move your camera, change posture, or switch monitors.</p><div className="test-actions"><button onClick={()=>void c.begin()}>Try again</button>{c.accuracy?.usable&&<button className="primary" onClick={c.accept}>Use this calibration</button>}</div></div>}
 </div>;
}
