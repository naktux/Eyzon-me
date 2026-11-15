import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newAttention,observeAttention} from '../lib/attention.mjs';
import {advance} from '../lib/focus.mjs';
import {newCalibration,sampleCalibration} from '../lib/calibration.mjs';
const baseline={yaw:0,pitch:0,gazeX:0,gazeY:0};
const forward={face:true,gaze:false,yaw:0,pitch:0,gazeX:0,gazeY:0,blinkStrength:0};
function harness(profile='balanced'){
 const state=newAttention();let time=0,view;
 return {state,step(o,ms=67){time+=ms;view=observeAttention(state,{...forward,...o},baseline,time,profile);return view;},run(o,ms){for(let elapsed=0;elapsed<ms;elapsed+=67)this.step(o);return view;}};
}
test('noisy raw eye flags and ordinary reading movements do not drain focus',()=>{
 const h=harness();h.run({},1000);let focus={score:100,away:0,critical:false},transitions=0,last=true;
 for(let i=0;i<300;i++){
  const v=h.step({gaze:i%2===0,gazeX:Math.sin(i)*.08,gazeY:Math.cos(i)*.06,yaw:Math.sin(i/4)*8,pitch:Math.cos(i/3)*6});
  if(v.focused!==last)transitions++;last=v.focused;focus=advance(focus,v.focused,.067);
 }
 assert.equal(transitions,0);assert.equal(focus.score,100);
});
test('short pose spikes and brief face dropouts are ignored',()=>{
 const h=harness();h.run({},1000);h.step({yaw:60,gazeX:.8,gaze:true});assert.equal(h.run({},600).focused,true);
 h.step({face:false});h.step({face:false});assert.equal(h.step({}).focused,true);
});
test('blinks cannot move the eye target or trigger distraction',()=>{
 const h=harness();h.run({},1000);const target=h.state.target;
 h.step({gaze:true,gazeX:1,gazeY:1,blinkStrength:.95});h.step({gaze:true,gazeX:1,gazeY:1,blinkStrength:.95});
 assert.equal(h.step({}).focused,true);assert.deepEqual(h.state.target,target);
});
test('sustained distraction triggers, threshold hovering does not chatter, and looking back recovers',()=>{
 const h=harness();h.run({},1000);assert.equal(h.run({yaw:40},1200).focused,false);
 for(let i=0;i<70;i++)assert.equal(h.step({yaw:i%2?24:26}).focused,false);
 assert.equal(h.run({},1200).focused,true);
 const g=harness();g.run({},1000);assert.equal(g.run({gazeX:.55,gaze:true},1200).focused,false);assert.equal(g.run({},1200).focused,true);
});
test('face departure and prolonged eye closure still count as distraction',()=>{
 const h=harness();h.run({},1000);assert.equal(h.run({face:false},1100).focused,false);assert.equal(h.state.target,null);assert.equal(h.run({},1200).focused,true);
 assert.equal(h.run({blinkStrength:.95},1500).focused,false);
});
test('pet target dead zone suppresses tiny changes while allowing sustained direction changes',()=>{
 const h=harness();h.run({},1000);const start={...h.state.target};
 for(let i=0;i<100;i++)h.step({gazeX:Math.sin(i)*.015,gazeY:Math.cos(i)*.01});
 assert.deepEqual(h.state.target,start);h.run({gazeX:.5},1500);assert.ok(h.state.target.x>.85);
});
test('sensitivity profiles change tolerance without changing score drain',()=>{
 const strict=harness('strict'),gentle=harness('gentle');strict.run({},1000);gentle.run({},1000);
 assert.equal(strict.run({yaw:28},1500).focused,false);assert.equal(gentle.run({yaw:28},1500).focused,true);
});
test('invalid samples are rejected and long gaps reset pending confirmations',()=>{
 const h=harness();h.run({},1000);assert.equal(h.step({yaw:NaN}),null);assert.equal(h.step({yaw:40},3000).focused,true);
});
test('one coherent decision controls both scoring and pet reactions',()=>{
 const h=harness();h.run({},1000);let focus={score:100,away:0,critical:false};
 for(let i=0;i<100;i++){const view=h.step({gazeX:.6});focus=advance(focus,view.focused,.067);assert.equal(!view.focused,!h.state.focused);}
 assert.ok(focus.score<70);
});
test('calibration ignores a short blink and retains a stable neutral baseline',()=>{
 const c=newCalibration(0);let result;
 for(let now=0;now<=2100;now+=100){const o=now===1000?{...forward,blinkStrength:.95,gaze:true,gazeX:1}:{...forward};result=sampleCalibration(c,o,now);}
 assert.deepEqual(result.baseline,baseline);
});

test('neutral calibration tolerates a noisy raw eye expression flag',()=>{
 const c=newCalibration(0);let result;
 for(let t=0;t<=2000;t+=100)result=sampleCalibration(c,{...forward,gaze:t%200===0,gazeX:.12,gazeY:.1},t);
 assert.deepEqual(result.baseline,{yaw:0,pitch:0,gazeX:.12,gazeY:.1});
});
