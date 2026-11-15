import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advance,tier} from '../lib/focus.mjs';
const initial=()=>({score:100,away:0,critical:false});
test('brief glances do not drain score',()=>{let s=advance(initial(),false,.7);assert.equal(s.score,100);s=advance(s,true,.05);assert.equal(s.away,0);assert.equal(s.score,100);});
test('sustained distraction and slow recovery',()=>{let s=advance(initial(),false,8.85);assert.ok(Math.abs(s.score-19)<1e-8);assert.equal(tier(s),3);s=advance(s,true,4.2);assert.equal(s.score,40);assert.equal(tier(s),3);s=advance(s,true,.05);assert.equal(tier(s),2);});
test('score boundaries and clamping',()=>{for(const [score,t] of [[100,0],[80,0],[79.9,1],[50,1],[49.9,2],[20,2],[19.9,3]])assert.equal(tier(advance({score,away:0,critical:false},true,0)),t);assert.equal(advance(initial(),false,99).score,0);assert.equal(advance(initial(),true,99).score,100);});
test('frame rate independent scoring',()=>{let s=initial();for(let i=0;i<100;i++)s=advance(s,false,.05);assert.ok(Math.abs(s.score-advance(initial(),false,5).score)<1e-8);});

test('drain rate is adjustable',()=>{assert.equal(advance(initial(),false,1.75,80).score,20);assert.equal(advance(initial(),false,1.75,20).score,80);});

test('default drain is gentle and allows brief glances',()=>{assert.equal(advance(initial(),false,.75).score,100);assert.equal(advance(initial(),false,1.75).score,90);assert.equal(advance(initial(),false,8.75).score,20);assert.equal(tier(advance(initial(),false,8.8)),3);assert.equal(advance(initial(),false,1.75,1).score,99);});
