type Observation = { face: boolean; gaze: boolean; yaw: number; pitch: number; gazeX?:number; gazeY?:number; blinkStrength?:number };
export type Calibration = { started: number; last: number; samples: Observation[] };
export function newCalibration(now: number): Calibration;
export function sampleCalibration(state: Calibration, observation: Observation, now: number): { message: string; baseline?: { yaw: number; pitch: number; gazeX?:number; gazeY?:number; blinkStrength?:number } };
