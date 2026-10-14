import type { Place } from "@/lib/locations";
import type { LatLng } from "@/components/game/GuessMap";

export type RoundResult = {
  place: Place;
  guess: LatLng;
  distanceKm: number;
  score: number;
};
