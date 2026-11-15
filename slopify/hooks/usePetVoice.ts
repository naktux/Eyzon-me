import {useCallback,useEffect,useRef,useState} from 'react';
import {VOICE_LINES,type VoiceLineId} from '../lib/voice-lines.mjs';
export function usePetVoice(){
 const [speaking,setSpeaking]=useState(false),[voiceStatus,setVoiceStatus]=useState('Gradium voice · ready offline');
 const audio=useRef<HTMLAudioElement|null>(null),generation=useRef(0);
 const stopVoice=useCallback(()=>{
  generation.current++;
  if(audio.current){audio.current.onended=null;audio.current.pause();audio.current.removeAttribute('src');audio.current.load();audio.current=null;}
  if('speechSynthesis' in window)window.speechSynthesis.cancel();
  setSpeaking(false);
 },[]);
 const say=useCallback((id:VoiceLineId)=>{
  stopVoice();const token=generation.current,line=VOICE_LINES[id];
  const player=new Audio(new URL(`voice/${id}.wav`,document.baseURI).href);audio.current=player;
  player.preload='none';player.volume=.7;
  player.onended=()=>{if(token===generation.current)stopVoice();};
  setSpeaking(true);setVoiceStatus('Eyzon is speaking · Gradium');
  void player.play().then(()=>{if(token===generation.current)setVoiceStatus('Gradium voice · ready offline');}).catch((error:unknown)=>{
   if(token!==generation.current)return;
   player.pause();player.removeAttribute('src');player.load();audio.current=null;setSpeaking(false);
   if(error instanceof DOMException&&error.name==='NotAllowedError'){setVoiceStatus('Click Test Eyzon’s voice to allow audio.');return;}
   setVoiceStatus('Using the device backup voice. Gradium clip unavailable.');
   if(!('speechSynthesis' in window))return;
   try{
    const utterance=new SpeechSynthesisUtterance(line.text);utterance.rate=1;utterance.pitch=1.15;utterance.volume=.7;
    utterance.onstart=()=>{if(token===generation.current)setSpeaking(true);};
    const finished=()=>{if(token===generation.current)setSpeaking(false);};
    utterance.onend=finished;utterance.onerror=finished;window.speechSynthesis.speak(utterance);
   }catch{/* The visible speech bubble remains available. */}
  });
 },[stopVoice]);
 useEffect(()=>()=>{generation.current++;if(audio.current){audio.current.onended=null;audio.current.pause();audio.current.removeAttribute('src');audio.current.load();}if('speechSynthesis' in window)window.speechSynthesis.cancel();},[]);
 return {speaking,voiceStatus,say,stopVoice};
}
