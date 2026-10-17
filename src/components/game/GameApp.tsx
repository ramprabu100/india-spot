"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Trophy } from "lucide-react";
import { SeterraPinQuiz } from "@/components/game/SeterraPinQuiz";
import {
  ROUNDS_PER_GAME,
  getLiveRegion,
  placesForMode,
  shufflePlaces,
  type Place,
} from "@/lib/locations";
import { QUIZZES } from "@/lib/quizzes";
import { haversineKm } from "@/lib/haversine";
import { scoreFromDistanceKm } from "@/lib/scoring";
import { HomeScreen } from "@/components/game/HomeScreen";
import { SummaryScreen } from "@/components/game/SummaryScreen";
import { SpotPlayingView } from "@/components/game/SpotPlayingView";
import type { RoundResult } from "@/components/game/types";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("quiz");
    if (!id) return;
    const quiz = QUIZZES.find((q) => q.id === id);
    if (quiz?.status === "live" && quiz.geoPath) {
      setScreen({ kind: "seterra", quizId: quiz.id });
    }
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
          <span className="hidden text-xs uppercase tracking-[0.18em] text-[var(--muted)] sm:inline">
            TN first
          </span>
        </button>
        {inSpot && screen.kind !== "spot-summary" && (
          <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <span className="hidden rounded border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wider sm:inline">
              Spot the place
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="size-3.5 text-[var(--accent)]" aria-hidden />
              <span className="tabular-nums text-[var(--fg)]">
                {sessionScore.toLocaleString()}
              </span>
            </span>
            <span className="tabular-nums">
              Round {Math.min(roundIndex + 1, deck.length)}/{deck.length}
            </span>
          </div>
        )}
      </header>

      {screen.kind === "home" && (
        <HomeScreen
          onStartSpot={startSpot}
          onStartQuiz={(quiz, mode) => {
            if (mode !== "pin" || quiz.status !== "live" || !quiz.geoPath) return;
            setScreen({ kind: "seterra", quizId: quiz.id });
          }}
        />
      )}

      {screen.kind === "seterra" && activeQuiz?.geoPath && (
        <SeterraPinQuiz
          title={activeQuiz.title}
          geoPath={activeQuiz.geoPath}
          quizId={activeQuiz.id}
          itemNoun={activeQuiz.itemNoun ?? "regions"}
          mapLabel={`${activeQuiz.title} map`}
          onExit={() => setScreen({ kind: "home" })}
        />
      )}

      {(screen.kind === "spot-playing" || screen.kind === "spot-result") &&
        place && (
          <SpotPlayingView
            place={place}
            screenKind={screen.kind}
            mapOpen={mapOpen}
            setMapOpen={setMapOpen}
            guess={guess}
            setGuess={setGuess}
            liveName={live.name}
            bounds={live.bounds!}
            GuessMap={GuessMap}
            results={results}
            roundIndex={roundIndex}
            deckLength={deck.length}
            submitGuess={submitGuess}
            nextRound={nextRound}
          />
        )}

      {screen.kind === "spot-summary" && (
        <SummaryScreen
          results={results}
          total={sessionScore}
          onReplay={startSpot}
          onHome={() => setScreen({ kind: "home" })}
        />
      )}
    </div>
  );
}
