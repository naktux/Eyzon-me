export type Mood = "studying" | "suspicious" | "panicking" | "fainted";
export type Target = {x:number;y:number}|null;
export type Reaction = {id:number;text:string;expiresAt:number}|null;
export type Snapshot = { running:boolean; score:number; mood:Mood; position:number; positionY:number; updatedAt:number; distracted:boolean; target:Target; reaction:Reaction;space:Space|null };
export type ControllerMessage = { type:"publish"; running:boolean; score:number; mood:Mood; distracted:boolean; target:Target; reaction:Reaction;space:Space|null };
export type PetMessage = { type:"position"; position:number; positionY:number } | { type:"visible"; visible:boolean };
export type BrokerMessage = { type:"snapshot"; snapshot:Snapshot } | { type:"owner"; accepted:boolean };
export const STALE_MS = 6000;
export const EMPTY: Snapshot = { running:false, score:100, mood:"studying", position:.88, positionY:1, updatedAt:0, distracted:false, target:null, reaction:null,space:null };
export const isMood = (m:unknown):m is Mood => ["studying","suspicious","panicking","fainted"].includes(String(m));
export function validTarget(t:unknown):t is Target { if(t===null)return true;if(typeof t!=="object"||!t)return false;const p=t as {x:number;y:number};return Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1; }
import type {Space} from '../lib/screen-gaze.mjs';
export function validSpace(value:unknown):value is Space|null {if(value===null)return true;if(!value||typeof value!=='object')return false;const s=value as Space;return [s.left,s.top,s.width,s.height].every(Number.isFinite)&&s.width>0&&s.height>0&&s.width<50000&&s.height<50000;}
