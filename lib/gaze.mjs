const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const finite = v => Number.isFinite(v) ? v : 0;
export function blendGaze(categories) {
 const values = new Map(categories.map(c => [c.categoryName, c.score]));
 const value = name => finite(values.get(name));
 return {
  x: clamp((value('eyeLookOutRight') + value('eyeLookInLeft') - value('eyeLookOutLeft') - value('eyeLookInRight')) / 2, -1, 1),
  y: clamp((value('eyeLookDownLeft') + value('eyeLookDownRight') - value('eyeLookUpLeft') - value('eyeLookUpRight')) / 2, -1, 1),
 };
}
export function isLookingAway(o, baseline) { return !o.face || o.gaze || Math.abs(o.yaw - baseline.yaw) >= 25 || Math.abs(o.pitch - baseline.pitch) >= 20; }
// A coarse direction estimate, not a measured point-of-regard or mouse cursor.
export function estimateTarget(o, baseline) {
 if (!o.face) return null;
 return { x: clamp(.5 + (finite(o.gazeX) - finite(baseline.gazeX)) * 1.1 + (o.yaw - baseline.yaw) / 80, 0, 1), y: clamp(.5 + (finite(o.gazeY) - finite(baseline.gazeY)) * 1.1 + (o.pitch - baseline.pitch) / 65, 0, 1) };
}
