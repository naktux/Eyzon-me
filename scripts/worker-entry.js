import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { blendGaze } from '../lib/gaze.mjs';
import { eyeFeatures } from '../lib/screen-gaze.mjs';
let model;
self.onmessage = async ({data}) => {
 try {
 if(data.type === 'close') { model?.close(); self.close(); return; }
 if(data.type === 'init') {
 model = await FaceLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(data.base + '/tracking/wasm'), {baseOptions:{modelAssetPath:data.base+'/tracking/face_landmarker.task'}, runningMode:'VIDEO', numFaces:1, outputFaceBlendshapes:true, outputFacialTransformationMatrixes:true});
 postMessage({type:'ready'});
 } else if(data.type === 'frame') {
 try {
 const r=model.detectForVideo(data.frame,data.time);
 const m=r.facialTransformationMatrixes[0]?.data;
 const yaw=m?Math.atan2(m[8],m[10])*180/Math.PI:0;
 const pitch=m?Math.atan2(-m[9],Math.hypot(m[8],m[10]))*180/Math.PI:0;
 const expressions=new Map((r.faceBlendshapes[0]?.categories||[]).map(c=>[c.categoryName,c.score]));
 const blinkStrength=((expressions.get('eyeBlinkLeft')||0)+(expressions.get('eyeBlinkRight')||0))/2;
 const direction=blendGaze(r.faceBlendshapes[0]?.categories||[]);
 const screenFeatures=eyeFeatures(r.faceLandmarks[0],yaw,pitch,direction);
 const gaze=(r.faceBlendshapes[0]?.categories||[]).some(c=>/^eyeLook(Out|Up|Down)/.test(c.categoryName)&&c.score>.45);
 const points = data.preview === false ? [] : (r.faceLandmarks[0] || []);
 const landmarks = new Float32Array(points.length * 2);
 points.forEach((p,i)=>{landmarks[i*2]=p.x;landmarks[i*2+1]=p.y;});
 postMessage({type:'result',face:!!r.faceLandmarks.length,gaze,yaw,pitch,gazeX:direction.x,gazeY:direction.y,blinkStrength,screenFeatures,landmarks},[landmarks.buffer]);
 } finally { data.frame.close(); }
 }
 } catch(e) {postMessage({type:'error',message:String(e)});}
};
