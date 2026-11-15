export function advance(state, focused, seconds, drainRate = 10) {
 const away = focused ? 0 : state.away + seconds;
 const drain = Math.max(0, away - .75) - Math.max(0, state.away - .75);
 const score = Math.max(0, Math.min(100, state.score + (focused ? 5 * seconds : -drainRate * drain)));
 const critical = score < 20 || (state.critical && score <= 40);
 return { score, away, critical };
}
export function tier(s) { return s.critical ? 3 : s.score < 50 ? 2 : s.score < 80 ? 1 : 0; }
