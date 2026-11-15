type Pose = {yaw:number; pitch:number; gazeX?:number; gazeY?:number};
export function blendGaze(categories:{categoryName:string;score:number}[]):{x:number;y:number};
export function isLookingAway(o:Pose & {face:boolean;gaze:boolean},baseline:Pose):boolean;
export function estimateTarget(o:Pose & {face:boolean},baseline:Pose):{x:number;y:number}|null;
