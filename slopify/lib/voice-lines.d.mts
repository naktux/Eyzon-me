export type VoiceLineId='welcome'|'suspicious1'|'suspicious2'|'suspicious3'|'panicking1'|'panicking2'|'panicking3'|'urgent1'|'urgent2'|'urgent3'|'fainted';
export const VOICE_LINES:Record<VoiceLineId,{text:string;spokenText?:string}>;
export const REACTION_BUCKETS:Record<'suspicious'|'panicking'|'urgent'|'fainted',VoiceLineId[]>;
