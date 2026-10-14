/**
 * GeoGuessr-style exponential score.
 * Perfect pin = 5,000. Falls off with distance; ~0 beyond ~750 km
 * (covers most of Tamil Nadu with meaningful granularity).
 */
export const MAX_SCORE = 5000;
const DECAY_KM = 180;

export function scoreFromDistanceKm(distanceKm: number): number {
  if (distanceKm <= 0.025) return MAX_SCORE;
  const raw = MAX_SCORE * Math.exp(-distanceKm / DECAY_KM);
  return Math.max(0, Math.round(raw));
}

export function scoreLabel(score: number): string {
  if (score >= 4800) return "Pinpoint";
  if (score >= 4000) return "Excellent";
  if (score >= 3000) return "Strong";
  if (score >= 1800) return "Getting warm";
  if (score >= 800) return "Off the mark";
  return "Somewhere in India";
}
