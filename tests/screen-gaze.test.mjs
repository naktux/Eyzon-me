import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TRAIN_POINTS,CHECK_POINTS,fitScreen,predictScreen,checkAccuracy,validSample,summarize,eyeFeatures,viewportSpace,mapScreenPoint} from '../lib/screen-gaze.mjs';
import {newAttention,observeAttention} from '../lib/attention.mjs';
const baseline={yaw:0,pitch:0,gazeX:0,gazeY:0};
const features=p=>[(p.x-.5)*.5,(p.y-.5)*.3,(p.x-.5)*.48,(p.y-.5)*.31,(p.x-.5)*.6,(p.y-.5)*.4,0,0];
const point=p=>({target:p,features:features(p),baseline});
const trained=()=>fitScreen(TRAIN_POINTS.map(point));
test('five-point regression predicts independent points and reports validation pixel error',()=>{
 const model=trained();assert.ok(model);
 for(const p of CHECK_POINTS){const q=predictScreen(model,features(p));assert.ok(Math.hypot(q.x-p.x,q.y-p.y)<.025);}
 const accuracy=checkAccuracy(model,CHECK_POINTS.map(point),1920,1080);assert.equal(accuracy.usable,true);assert.ok(accuracy.mean<50);
});
test('fixed eyes cannot produce a usable screen calibration and wrong held-out points fail',()=>{
 assert.equal(fitScreen(TRAIN_POINTS.map(target=>({...point({x:.5,y:.5}),target}))),null);
 const wrong=CHECK_POINTS.map(p=>({...point({x:1-p.x,y:1-p.y}),target:p}));
 assert.equal(checkAccuracy(trained(),wrong,1920,1080).usable,false);
 assert.equal(checkAccuracy(trained(),[],1920,1080).usable,false);
 const flat=fitScreen(TRAIN_POINTS.map(p=>({...point({x:p.x,y:.5}),target:p})));
 assert.equal(checkAccuracy(flat,CHECK_POINTS.map(p=>({...point({x:p.x,y:.5}),target:p})),2560,1080).usable,false,'A wide screen must not hide a missing vertical signal');
});
test('invalid/blinking observations are excluded and point summaries resist outliers',()=>{
 const o={face:true,gaze:true,yaw:0,pitch:0,gazeX:0,gazeY:0,screenFeatures:features({x:.5,y:.5})};
 assert.equal(validSample(o),true);assert.equal(validSample({...o,blinkStrength:.9}),false);assert.equal(validSample({...o,face:false}),false);
 assert.equal(validSample({...o,screenFeatures:[NaN]}),false);assert.equal(predictScreen(trained(),[NaN]),null);
 const result=summarize([o,o,{...o,yaw:100,screenFeatures:Array(8).fill(99)}],{x:.5,y:.5});assert.deepEqual(result.features,Array(8).fill(0));assert.equal(result.baseline.yaw,0);
});
test('iris geometry is local to the eye and invariant to camera translation/scaling',()=>{
 const points=Array.from({length:478},()=>({x:0,y:0}));
 Object.assign(points,{33:{x:.2,y:.3},133:{x:.4,y:.3},468:{x:.31,y:.32},362:{x:.6,y:.3},263:{x:.8,y:.3},473:{x:.71,y:.32}});
 const a=eyeFeatures(points,3,5,{x:.1,y:.2});const b=eyeFeatures(points.map(p=>({x:p.x*2+5,y:p.y*2-3})),3,5,{x:.1,y:.2});
 a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-10));assert.equal(eyeFeatures([],0,0,{x:0,y:0}),null);
});
test('calibrated screen corners remain focused, sustained extrapolation distracts, and blinks do not move the target',()=>{
 const state=newAttention();let view,time=0;
 const run=(p,count=25,extra={})=>{for(let i=0;i<count;i++){time+=67;view=observeAttention(state,{face:true,gaze:true,yaw:0,pitch:0,gazeX:.6,gazeY:.5,screenPoint:p,...extra},baseline,time);}return view;};
 for(const p of TRAIN_POINTS)assert.equal(run(p).focused,true);
 assert.equal(run({x:1.4,y:.5}).focused,false);assert.equal(run({x:.5,y:.5},35).focused,true);
 const target={...state.target};run({x:4,y:4},2,{blinkStrength:.95});assert.deepEqual(state.target,target);
});
test('coordinate mapping accounts for browser chrome, zoom, and another window position',()=>{
 const base={innerWidth:1000,innerHeight:700,outerWidth:1016,outerHeight:808,screenX:100,screenY:50,devicePixelRatio:2};
 const space=viewportSpace(base,1);assert.deepEqual(space,{left:216,top:300,width:2000,height:1400});
 const destination=viewportSpace({...base,screenX:200,screenY:100,innerWidth:800,outerWidth:816},1);
 assert.deepEqual(mapScreenPoint({x:.5,y:.5},space,{...destination,dpr:2}),{x:400,y:300});
 const zoomed=viewportSpace({...base,innerWidth:500,innerHeight:350,devicePixelRatio:4},2);assert.deepEqual(zoomed,space);
 assert.deepEqual(mapScreenPoint({x:.7,y:.4},null,{left:0,top:0,width:1000,height:800,dpr:2}),{x:700,y:320});
});
