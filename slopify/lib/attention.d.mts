import type {Observation} from '../components/FocusTracker';
export type Profile='balanced'|'gentle'|'strict';
export type Baseline={yaw:number;pitch:number;gazeX?:number;gazeY?:number};
export type AttentionView={focused:boolean;reason:string;target:{x:number;y:number}|null;pose:Observation};
export type AttentionFilter={focused:boolean;reason:string;last:number|null;lastFace:number|null;missingSince:number|null;closedSince:number|null;pending:boolean|null;pendingSince:number;pose:{yaw:number;pitch:number;gazeX:number;gazeY:number}|null;history:{yaw:number;pitch:number;gazeX:number;gazeY:number}[];target:{x:number;y:number}|null;screen:{x:number;y:number}|null;screenHistory:{x:number;y:number}[]};
export const PROFILES:Record<Profile,{yaw:number;pitch:number;eyeX:number;eyeY:number;confirm:number}>;
export function newAttention():AttentionFilter;
export function observeAttention(state:AttentionFilter,o:Observation,baseline:Baseline,now:number,profile?:Profile):AttentionView|null;
