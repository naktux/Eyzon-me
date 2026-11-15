import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blendGaze,estimateTarget,isLookingAway} from '../lib/gaze.mjs';
import {stepMotion,urgency,normalizePoint} from '../lib/motion.mjs';
import {newCalibration,sampleCalibration} from '../lib/calibration.mjs';
test('eye direction combines both eyes with a consistent sign',()=>{
 assert.deepEqual(blendGaze([{categoryName:'eyeLookOutRight',score:.8},{categoryName:'eyeLookInLeft',score:.6}]),{x:.7,y:0});
 assert.equal(blendGaze([{categoryName:'eyeLookUpLeft',score:.8},{categoryName:'eyeLookUpRight',score:.6}]).y,-.7);
});
test('gaze estimate is calibrated, bounded, and unavailable without a face',()=>{
 const baseline={yaw:10,pitch:-5,gazeX:.2,gazeY:-.1};
 assert.deepEqual(estimateTarget({...baseline,face:true},baseline),{x:.5,y:.5});
 assert.deepEqual(estimateTarget({yaw:200,pitch:-200,gazeX:1,gazeY:-1,face:true},baseline),{x:1,y:0});
 assert.equal(estimateTarget({face:false,yaw:0,pitch:0},baseline),null);
 assert.equal(isLookingAway({face:true,gaze:false,yaw:35,pitch:-5},baseline),true);
});
test('calibration records neutral eye offsets',()=>{
 const c=newCalibration(0),o={face:true,gaze:false,yaw:10,pitch:0,gazeX:.2,gazeY:-.1};let result;
 for(let t=0;t<=2000;t+=100)result=sampleCalibration(c,o,t);
 assert.ok(Math.abs(result.baseline.gazeX-.2)<1e-8);assert.ok(Math.abs(result.baseline.gazeY+.1)<1e-8);
});
test('motion accelerates, settles and handles direction reversal without overshoot',()=>{
 let m={x:0,y:0,vx:0,vy:0};const target={x:500,y:200};
 m=stepMotion(m,target,1/60,500);assert.ok(m.x>0&&m.x<500/60);
 for(let i=0;i<600;i++){m=stepMotion(m,target,1/60,500);assert.ok(m.x<=500&&m.y<=200);}
 assert.ok(Math.abs(m.x-500)<.5&&Math.abs(m.y-200)<.5);assert.equal(m.vx,0);
 for(let i=0;i<600;i++)m=stepMotion(m,{x:10,y:20},1/60,500);
 assert.ok(Math.abs(m.x-10)<.5&&Math.abs(m.y-20)<.5);
});
test('urgency grows continuously and dragging stays within the viewport',()=>{
 assert.ok(urgency(25)>urgency(55));assert.ok(urgency(55)>urgency(85));assert.equal(urgency(20),1);
 assert.deepEqual(normalizePoint(-100,5000,1000,800,176),{x:0,y:1});
});
