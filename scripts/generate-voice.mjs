import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {VOICE_LINES} from '../lib/voice-lines.mjs';

// Developer-only command. No credentials enter the browser build.
try{process.loadEnvFile('.env.gradium.local');}catch(e){if(e.code!=='ENOENT')throw e;}
const key=process.env.GRADIUM_API_KEY;
if(!key){console.error('Set GRADIUM_API_KEY or add it to .env.gradium.local, then run npm run voice:generate.');process.exit(1);}
const directory=path.resolve('public/voice');await mkdir(directory,{recursive:true});
const voiceId=process.env.GRADIUM_VOICE_ID||'YTpq7expH9539ERJ';
const config={voice_id:voiceId,model_name:'default',output_format:'wav',only_audio:true,json_config:{temp:.6,padding_bonus:-.15,rewrite_rules:'en'}};
let prior={};try{prior=JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));}catch{/* First generation. */}
const manifest={provider:'Gradium',voiceId,clips:{}};
let generated=0;
for(const [id,line] of Object.entries(VOICE_LINES)){
 const body={...config,text:line.spokenText||line.text};
 const fingerprint=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 const file=`${id}.wav`,target=path.join(directory,file);
 let existing;try{existing=await readFile(target);}catch{/* Clip needs generation. */}
 if(prior.clips?.[id]?.fingerprint===fingerprint&&existing?.toString('ascii',0,4)==='RIFF'){
  manifest.clips[id]={file,text:line.text,fingerprint};continue;
 }
 try{
  const response=await fetch('https://api.gradium.ai/api/speech/tts',{method:'POST',headers:{'x-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000),redirect:'error'});
  if(!response.ok)throw Error(`Gradium HTTP ${response.status}${response.status===401||response.status===403?' (key rejected or not authorized)':''}`);
  const audio=Buffer.from(await response.arrayBuffer());
  if(audio.length<100||audio.length>8_000_000||audio.toString('ascii',0,4)!=='RIFF'||audio.toString('ascii',8,12)!=='WAVE')throw Error('Gradium returned an invalid WAV file');
  await writeFile(target+'.tmp',audio);await rename(target+'.tmp',target);
  manifest.clips[id]={file,text:line.text,fingerprint};generated++;
  console.log(`Generated ${id} (${Math.round(audio.length/1024)} KB)`);
  // Preserve completed work on interruption without repeating paid requests.
  await writeFile(path.join(directory,'manifest.json'),JSON.stringify({...manifest,clips:{...prior.clips,...manifest.clips}},null,2)+'\n');
 }catch(e){
  console.error(`Could not generate ${id}: ${e instanceof Error?e.message:'speech request failed'}. No API key or response body is logged.`);
  process.exitCode=1;break;
 }
}
if(!process.exitCode){await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(`Gradium voice ready: ${Object.keys(manifest.clips).length} clips, ${generated} generated.`);}
