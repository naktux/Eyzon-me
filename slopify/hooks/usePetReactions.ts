import {useCallback,useEffect,useRef,useState} from "react";
import type {Mood,Reaction} from "../extension/protocol";
import {VOICE_LINES,REACTION_BUCKETS,type VoiceLineId} from '../lib/voice-lines.mjs';
import {usePetVoice} from './usePetVoice';
export function usePetReactions(active:boolean,distracted:boolean,mood:Mood,score:number) {
 const [voice,setVoice]=useState(true),[reaction,setReaction]=useState<Reaction>(null);
 const {speaking,voiceStatus,say,stopVoice}=usePetVoice();
 const current=useRef({active,distracted,mood,score,voice});
 const last=useRef(0),sequence=useRef(0),previous=useRef(false);
 useEffect(()=>{current.current={active,distracted,mood,score,voice};},[active,distracted,mood,score,voice]);
 const show=useCallback((id:VoiceLineId)=>{const now=Date.now();setReaction({id:now,text:VOICE_LINES[id].text,expiresAt:now+6000});if(current.current.voice)say(id);},[say]);
 const testVoice=useCallback(()=>{setVoice(true);previous.current=true;last.current=Date.now();setReaction({id:last.current,text:VOICE_LINES.welcome.text,expiresAt:last.current+6000});say('welcome');},[say]);
 const greet=useCallback(()=>{previous.current=true;last.current=Date.now();show('welcome');},[show]);
 useEffect(()=>{
  const tick=()=>{
   const c=current.current;
   if(!c.active||!c.distracted){previous.current=false;return;}
   const now=Date.now();if((previous.current&&now-last.current<7000)||now-last.current<3000)return;
   previous.current=true;last.current=now;
   const bucket=c.mood==='fainted'?REACTION_BUCKETS.fainted:c.score<30?REACTION_BUCKETS.urgent:c.score<50?REACTION_BUCKETS.panicking:REACTION_BUCKETS.suspicious;
   show(bucket[sequence.current++%bucket.length]);
  };
  const timer=setInterval(tick,500);return()=>clearInterval(timer);
 },[show]);
 useEffect(()=>{if(!voice)stopVoice();},[voice,stopVoice]);
 const previousActive=useRef(active),previousDistracted=useRef(distracted);
 useEffect(()=>{if((previousActive.current&&!active)||(previousDistracted.current&&!distracted))stopVoice();previousActive.current=active;previousDistracted.current=distracted;},[active,distracted,stopVoice]);
 useEffect(()=>{if(!reaction)return;const timer=setTimeout(()=>setReaction(null),Math.max(0,reaction.expiresAt-Date.now()));return()=>clearTimeout(timer);},[reaction]);
 const stop=useCallback(()=>{stopVoice();setReaction(null);},[stopVoice]);
 const shown=reaction&&(distracted||reaction.text===VOICE_LINES.welcome.text)?reaction:null;
 return {voice,setVoice,reaction:shown,speaking,voiceStatus,testVoice,greet,stopVoice:stop};
}
