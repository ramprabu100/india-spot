"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  RotateCcw,
  Trophy,
  Compass,
  Camera,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanoramaView } from "@/components/game/PanoramaView";
import { SeterraPinQuiz } from "@/components/game/SeterraPinQuiz";
import {
  REGIONS,
  ROUNDS_PER_GAME,
  getLiveRegion,
  kindLabel,
  placesForMode,
  shufflePlaces,
  type Place,
} from "@/lib/locations";
import { SPOT_MODE } from "@/lib/modes";
import { QUIZZES, type QuizDef, type QuizModeId } from "@/lib/quizzes";
import { haversineKm, formatDistance } from "@/lib/haversine";
import { MAX_SCORE, scoreFromDistanceKm, scoreLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/components/game/GuessMap";

const GuessMap = dynamic(
  () => import("@/components/game/GuessMap").then((m) => m.GuessMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">
        Loading map…
      </div>
    ),
  },
);

type Screen =
  | { kind: "home" }
  | { kind: "spot-playing" }
  | { kind: "spot-result" }
  | { kind: "spot-summary" }
  | { kind: "seterra"; quizId: string };

type RoundResult = {
  place: Place;
  guess: LatLng;
  distanceKm: number;
  score: number;
};

export function GameApp() {
  const live = getLiveRegion();
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [deck, setDeck] = useState<Place[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [mapOpen, setMapOpen] = useState(false);

  const place = deck[roundIndex] ?? null;
  const sessionScore = useMemo(
    () => results.reduce((s, r) 