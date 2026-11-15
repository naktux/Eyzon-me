export type Focus = { score: number; away: number; critical: boolean };
export function advance(state: Focus, focused: boolean, seconds: number, drainRate?: number): Focus;
export function tier(state: Focus): number;
