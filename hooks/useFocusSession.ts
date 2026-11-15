import { useCallback, useEffect, useRef, useState } from "react";
import type { Observation } from "../components/FocusTracker";
import { advance, type Focus } from "../lib/focus.mjs";
import {predictScreen,type ScreenModel,type Space,type Accuracy} from "../lib/screen-gaze.mjs";
import {useScreenCalibration} from "./useScreenCalibration";
import {newAttention,observeAttention,type AttentionView,type Profile} from "../lib/attention.mjs";
import {usePetReactions} from "./usePetReactions";
import { moodOf } from "../lib/pet.mjs";
import type { BrokerMessage, ControllerMessage } from "../extension/protocol";
const INITIAL: Focus = { score: 100, away: 0, critical: false };
export function useFocusSession() {
 const [enabled, setEnabled] = useState(false), [preview, setPreview] = useState(false), [ready, setReady] = useState(false), [cameraReady, setCameraReady] = useState(false);
 const [error, setError] = useState(""), [devices, setDevices] = useState<MediaDeviceInfo[]>([]), [deviceId, setDeviceId] = useState(""), [attempt, setAttempt] = useState(0);
 const [mode, setMode] = useState<"live" | "simulation" | "override">("live"), [away, setAway] = useState(true), [override, setOverride] = useState(100);
 const [focus, setFocus] = useState<Focus>(INITIAL), [visible, setVisible] = useState(true), [fresh, setFresh] = useState(false), [owner, setOwner] = useState(false);
 const [pose, setPose] = useState<Observation>({ face: false, gaze: false, yaw: 0, pitch: 0 });
 const [calibrated, setCalibrated] = useState(false), [calibrationMessage, setCalibrationMessage] = useState("Test your camera, then follow the screen calibration dots.");
 const screenModel=useRef<ScreenModel|null>(null),[screenSpace,setScreenSpace]=useState<Space|null>(null);
 const attentionFilter=useRef(newAttention());
 const stableAttention=useRef<AttentionView>({focused:true,reason:"Steady focus",target:null,pose});
 const [attention,setAttention]=useState(stableAttention.current),[sensitivity,setSensitivity]=useState<Profile>('balanced');
 const sensitivityRef=useRef<Profile>('balanced');
 const baseline = useRef({ yaw:0,pitch:0,gazeX:0,gazeY:0 }), observation = useRef(pose), observedAt = useRef(0), lastPaint = useRef(0);
 const commitCalibration=useCallback((model:ScreenModel,space:Space,accuracy:Accuracy)=>{screenModel.current=model;baseline.current=model.baseline;setScreenSpace(space);attentionFilter.current=newAttention();setCalibrated(true);setCalibrationMessage(`Screen calibrated · ${Math.round(accuracy.mean)} px average check error. Recalibrate after changing posture, camera or monitor.`);},[]);
 const screenCalibration=useScreenCalibration(commitCalibration),calibrating=screenCalibration.phase!=='closed';
 const port = useRef<chrome.runtime.Port | undefined>(undefined), publication = useRef<ControllerMessage>({ type: "publish", running: false, score: 100, mood: "studying",distracted:false,target:null,reaction:null,space:null });
 const active = owner && enabled && !error && (mode !== "live" || (ready && fresh));
 const mood = moodOf(focus.score, focus.critical);
 const distracted=mode==='simulation'?away:mode==='override'?override<80:!attention.focused;
 const target=mode==='live'?attention.target:null;
 const [testTarget,setTestTarget]=useState({x:.7,y:.4});
 const reactions=usePetReactions(active,distracted,mood,focus.score);
 const pursuitTarget=mode==='live'?target:testTarget;
 useEffect(() => {
  const change = () => setVisible(!document.hidden);
  document.addEventListener("visibilitychange", change); return () => document.removeEventListener("visibilitychange", change);
 }, []);
 useEffect(() => {
  let disposed = false, retry: ReturnType<typeof setTimeout> | undefined;
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return; // Dashboard preview cannot start a real extension session.
  function connect() {
   try {
    const connection = chrome.runtime.connect({ name: "controller" }); port.current = connection;
    connection.onMessage.addListener((message: BrokerMessage) => { if (message.type === "owner") { setOwner(message.accepted); if (!message.accepted) setError("A control tab is already open. Use that tab to manage your session."); } });
    connection.onDisconnect.addListener(() => { port.current = undefined; if (!disposed) { setOwner(false); retry = setTimeout(connect, 800); } });
   } catch { if (!disposed) retry = setTimeout(connect, 1000); }
  }
  connect();
  const timer = setInterval(() => { try { port.current?.postMessage(publication.current); } catch { /* Reconnect on disconnect. */ } }, 200);
  return () => { disposed = true; clearInterval(timer); clearTimeout(retry); port.current?.disconnect(); };
 }, []);
 useEffect(() => {
  const changed = publication.current.running !== active || publication.current.mood !== mood;
  publication.current = { type: "publish", running: active, score: focus.score, mood, distracted, target:pursuitTarget,reaction:reactions.reaction,space:mode==='live'?screenSpace:null };
  if(changed) try { port.current?.postMessage(publication.current); } catch { /* Heartbeat retries. */ }
 }, [active, mood, focus.score,distracted,pursuitTarget,reactions.reaction,mode,screenSpace]);
 useEffect(() => {
  if (!enabled) return;
  let last = performance.now();
  const timer = setInterval(() => {
   const now = performance.now(), dt = (now - last) / 1000; last = now;
   const available = mode !== "live" || (ready && now - observedAt.current < 1000); setFresh(available);
   if (!available || error || dt > 2) return; // Sleep and stale samples never earn or drain focus.
   if (mode === "override") { setFocus(s => ({ score: override, away: 0, critical: override < 20 || (s.critical && override <= 40) })); return; }
   const focused = mode === "simulation" ? !away : stableAttention.current.focused;
   setFocus(s => { const next = advance(s, focused, dt); return next.score === s.score && next.away === s.away && next.critical === s.critical ? s : next; });
  }, 100);
  return () => clearInterval(timer);
 }, [enabled, mode, ready, error, override, away]);
 const cancelCalibration=screenCalibration.cancel,sampleScreen=screenCalibration.sample;
 const resetCalibration = useCallback(() => { cancelCalibration();screenModel.current=null;setScreenSpace(null);attentionFilter.current=newAttention(); stableAttention.current={focused:true,reason:"Steady focus",target:null,pose:observation.current};setAttention(stableAttention.current); baseline.current = {yaw:0,pitch:0,gazeX:0,gazeY:0}; setCalibrated(false); setCalibrationMessage("Test your camera, then follow the screen calibration dots."); }, [cancelCalibration]);
 const onResult = useCallback((o: Observation) => {
  const now = performance.now();
  sampleScreen(o,now);
  const screenPoint=o.face?predictScreen(screenModel.current,o.screenFeatures):null;
  const filtered=observeAttention(attentionFilter.current,{...o,screenPoint},baseline.current,now,sensitivityRef.current);if(!filtered)return;
  observation.current=o;observedAt.current=now;stableAttention.current=filtered;
  if(now-lastPaint.current>150){setPose(filtered.pose);setAttention(filtered);lastPaint.current=now;}
 }, [sampleScreen]);
 function retry() { resetCalibration(); setError(""); setReady(false); setCameraReady(false); setPreview(true); setAttempt(n => n + 1); }
 function stop() { reactions.stopVoice();setEnabled(false); setPreview(false); setReady(false); setCameraReady(false); setFresh(false); cancelCalibration(); }
 function start() { if (!owner || (mode === "live" && (!ready || !calibrated || error || calibrating))) return; setFocus(INITIAL); setFresh(mode !== "live" || performance.now() - observedAt.current < 1000); setEnabled(true);reactions.greet(); }
 function simulate() { resetCalibration(); setMode("simulation"); setAway(a => mode === "simulation" ? !a : true); setPreview(false); setReady(false); setCameraReady(false); setError(""); }
 function live() { setMode("live"); retry(); }
 function selectDevice(id: string) { setDeviceId(id); retry(); }
 function startCalibration() { reactions.stopVoice();setEnabled(false);setPreview(true);screenCalibration.open(); }
 function onError(message: string, source: "camera" | "tracking") { setError(message); setReady(false); if (source === "camera") setCameraReady(false); cancelCalibration(); }
 function overrideScore(value: number) { resetCalibration(); setMode("override"); setOverride(value); setFocus(s => ({ score: value, away: 0, critical: value < 20 || (s.critical && value <= 40) })); setPreview(false); setReady(false); setCameraReady(false); setError(""); }
 function changeSensitivity(value:Profile){sensitivityRef.current=value;setSensitivity(value);attentionFilter.current=newAttention();}
 return {screenCalibration,attention,sensitivity,changeSensitivity,distracted,target:pursuitTarget,testTarget,setTestTarget,...reactions, enabled, active, preview, ready, cameraReady, owner, error, devices, deviceId, attempt, mode, away, override, focus, mood, visible, pose, calibrating, calibrated, calibrationMessage,
  start, stop, retry, simulate, live, selectDevice, startCalibration, onResult, onError, overrideScore, setReady, setCameraReady, setDevices, resetCalibration };
}
