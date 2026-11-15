import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stepThrow} from '../lib/motion.mjs';
test('throw preserves momentum, falls, bounces within bounds, and settles',()=>{
 let s={x:300,y:100,vx:1600,vy:-400},bounced=false;
 for(let i=0;i<1200;i++){const previous=s;s=stepThrow(s,1/60,1000,800,176);if(previous.vx>0&&s.vx<0)bounced=true;assert.ok(s.x>=12&&s.x<=812&&s.y>=12&&s.y<=612);}
 assert.equal(bounced,true);assert.equal(s.y,612);assert.equal(s.vx,0);assert.equal(s.vy,0);
});
test('throw handles a viewport smaller than the pet without escaping',()=>{
 const s=stepThrow({x:-100,y:900,vx:-800,vy:1000},.05,100,100,176);assert.equal(s.x,12);assert.equal(s.y,12);
});
