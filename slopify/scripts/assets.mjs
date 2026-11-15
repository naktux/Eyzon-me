import {mkdir,cp,writeFile,access} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('public/tracking',{recursive:true});
await cp('node_modules/@mediapipe/tasks-vision/wasm','public/tracking/wasm',{recursive:true,force:false,errorOnExist:false});
await build({entryPoints:['scripts/worker-entry.js'],bundle:true,format:'iife',outfile:'public/tracking/worker.js'});
try {await access('public/tracking/face_landmarker.task');} catch {
 const r=await fetch('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task');
 if(!r.ok)throw Error('Model download failed: '+r.status);
 await writeFile('public/tracking/face_landmarker.task',Buffer.from(await r.arrayBuffer()));
}

