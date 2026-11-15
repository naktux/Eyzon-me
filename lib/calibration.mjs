const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
export function newCalibration(now) { return { started: now, last: now, samples: [] }; }
export function sampleCalibration(state, observation, now) {
 if((observation.blinkStrength||0)>.6&&observation.face&&now-state.last<300)return {message:"Blink detected - keep looking forward."};
 const directional=Number.isFinite(observation.gazeX)&&Number.isFinite(observation.gazeY);
 const clearlyLookingAway=directional?(Math.abs(observation.gazeX)>.55||Math.abs(observation.gazeY)>.55):observation.gaze;
 if (!observation.face || clearlyLookingAway) {
  state.started = now; state.last = now; state.samples = [];
  return { message: !observation.face ? "No face detected. Face the camera to calibrate." : "Look at your screen to set your forward position." };
 }
 const first = state.samples.length?{yaw:median(state.samples.slice(-11).map(p=>p.yaw)),pitch:median(state.samples.slice(-11).map(p=>p.pitch))}:null;
 if (!first || now - state.last > 500 || Math.abs(observation.yaw - first.yaw) > 8 || Math.abs(observation.pitch - first.pitch) > 8) {
  state.started = now; state.samples = [];
 }
 state.last = now; state.samples.push(observation);
 if (now - state.started >= 2000) {
  return { message: "Calibration complete. Your forward position is set.", baseline: { yaw: median(state.samples.map(p=>p.yaw)), pitch: median(state.samples.map(p=>p.pitch)), gazeX: median(state.samples.map(p=>p.gazeX||0)), gazeY: median(state.samples.map(p=>p.gazeY||0)) } };
 }
 return { message: `Hold still and look forward: ${Math.max(0, 2 - (now - state.started) / 1000).toFixed(1)}s` };
}
