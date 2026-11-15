export function moodOf(score, fainted = false) {
  if (score < 20 || (fainted && score <= 40)) return "fainted";
  return score < 50 ? "panicking" : score < 80 ? "suspicious" : "studying";
}
export function clampPosition(clientX, width, petWidth = 112) {
  const travel = Math.max(0, width - petWidth - 24);
  return travel === 0 ? 0 : Math.max(0, Math.min(1, (clientX - petWidth / 2 - 12) / travel));
}
