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
    () => results.reduce((s, r) => s + r.score, 0),
    [results],
  );

  const startSpot = useCallback(() => {
    const next = shufflePlaces(placesForMode("spot"), ROUNDS_PER_GAME);
    setDeck(next);
    setRoundIndex(0);
    setGuess(null);
    setResults([]);
    setMapOpen(false);
    setScreen({ kind: "spot-playing" });
  }, []);

  const submitGuess = useCallback(() => {
    if (!place || !guess) return;
    const distanceKm = haversineKm(guess, {
      lat: place.lat,
      lng: place.lng,
    });
    const score = scoreFromDistanceKm(distanceKm);
    setResults((prev) => [...prev, { place, guess, distanceKm, score }]);
    setScreen({ kind: "spot-result" });
  }, [place, guess]);

  const nextRound = useCallback(() => {
    if (roundIndex + 1 >= deck.length) {
      setScreen({ kind: "spot-summary" });
      return;
    }
    setRoundIndex((i) => i + 1);
    setGuess(null);
    setMapOpen(false);
    setScreen({ kind: "spot-playing" });
  }, [roundIndex, deck.length]);

  useEffect(() => {
    placesForMode("spot").forEach((p) => {
      if (!p.image) return;
      const img = new Image();
      img.src = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p.image}`;
    });
  }, []);

  const activeQuiz =
    screen.kind === "seterra"
      ? QUIZZES.find((q) => q.id === screen.quizId)
      : null;

  const inSpot =
    screen.kind === "spot-playing" ||
    screen.kind === "spot-result" ||
    screen.kind === "spot-summary";

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 atmosphere" aria-hidden />

      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          className="flex items-baseline gap-2 text-left"
          onClick={() => setScreen({ kind: "home" })}
        >
          <h1 className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--fg)] sm:text-2xl">
            India Spot
          </h1>
          