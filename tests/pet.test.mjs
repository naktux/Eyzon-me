import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moodOf,clampPosition} from '../lib/pet.mjs';
import {newCalibration,sampleCalibration} from '../lib/calibration.mjs';
test('all mood boundaries and faint recovery',()=>{
 for(const [score,mood] of [[100,'studying'],[80,'studying'],[79.9,'suspicious'],[50,'suspicious'],[49.9,'panicking'],[20,'panicking'],[19.9,'fainted']])assert.equal(moodOf(score),mood);
 assert.equal(moodOf(40,true),'fainted');assert.equal(moodOf(40.1,true),'panicking');
});
test('pet position stays bounded and survives viewport resizing',()=>{
 assert.equal(clampPosition(-30,1000),0);assert.equal(clampPosition(2000,1000),1);assert.equal(clampPosition(68,1000),0);assert.equal(clampPosition(50,80),0);
});
test('calibration needs two seconds of valid stable samples',()=>{
 const c=newCalibration(0),o={face:true,gaze:false,yaw:15,pitch:-5};let r;
 for(let now=0;now<=2000;now+=100)r=sampleCalibration(c,o,now);
 assert.deepEqual(r.baseline,{yaw:15,pitch:-5,gazeX:0,gazeY:0});
});
test('missing faces, gaze, movement and stale gaps reset calibration',()=>{
 const o={face:true,gaze:false,yaw:0,pitch:0};
 for(const bad of [{...o,face:false},{...o,gaze:true},{...o,yaw:20}]){
  const c=newCalibration(0);for(let t=0;t<=1500;t+=100)sampleCalibration(c,o,t);
  assert.equal(sampleCalibration(c,bad,1600).baseline,undefined);assert.equal(sampleCalibration(c,o,2000).baseline,undefined);
 }
 const c=newCalibration(0);sampleCalibration(c,o,0);assert.equal(sampleCalibration(c,o,3000).baseline,undefined);
});
