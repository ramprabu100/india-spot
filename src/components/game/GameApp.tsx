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
          onExit={() => setScreen({ kind: "home" })}
        />
      )}

      {(screen.kind === "spot-playing" || screen.kind === "spot-result") &&
        place && (
          <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-28 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:pb-8">
            <section className="relative animate-rise overflow-hidden rounded-xl border border-[var(--border)] shadow-[var(--shadow)]">
              <PanoramaView
                place={place}
                revealed={screen.kind === "spot-result"}
              />
            </section>

            <section
              className={cn(
                "flex flex-col gap-3",
                mapOpen
                  ? "fixed inset-0 z-40 bg-[var(--bg)] p-4 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0"
                  : "hidden lg:flex",
              )}
            >
              <div className="flex items-center justify-between lg:hidden">
                <p className="font-[family-name:var(--font-display)] text-lg">
                  Drop your pin
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setMapOpen(false)}
                >
                  Close
                </Button>
              </div>
              <p className="hidden text-sm text-[var(--muted)] lg:block">
                Guess where this place is in {live.name}. Closer pins score
                higher (max {MAX_SCORE.toLocaleString()}).
              </p>
              <div className="min-h-0 w-full flex-1">
                <GuessMap
                  mapKey={`spot-${place.id}-${mapOpen ? "open" : "dock"}`}
                  guess={guess}
                  onGuess={setGuess}
                  truth={screen.kind === "spot-result" ? place : null}
                  revealed={screen.kind === "spot-result"}
                  interactive={screen.kind === "spot-playing"}
                  bounds={live.bounds!}
                />
              </div>

              {screen.kind === "spot-playing" && (
                <div className="relative z-20 flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    size="lg"
                    disabled={!guess}
                    onClick={submitGuess}
                  >
                    <MapPin className="size-4" aria-hidden />
                    {guess ? "Lock guess" : "Drop a pin first"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="lg:hidden"
                    onClick={() => setMapOpen(false)}
                  >
                    Back
                  </Button>
                </div>
              )}

              {screen.kind === "spot-result" && results[results.length - 1] && (
                <div className="relative z-20">
                  <ResultPanel
                    result={results[results.length - 1]}
                    isLast={roundIndex + 1 >= deck.length}
                    onNext={nextRound}
                  />
                </div>
              )}
            </section>

            {screen.kind === "spot-playing" && !mapOpen && (
              <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 p-4 backdrop-blur lg:hidden">
                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  onClick={() => setMapOpen(true)}
                >
                  <Compass className="size-4" />
                  Open map & guess
                </Button>
              </div>
            )}
          </main>
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

function HomeScreen({
  onStartSpot,
  onStartQuiz,
}: {
  onStartSpot: () => void;
  onStartQuiz: (quiz: QuizDef, mode: QuizModeId) => void;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 shadow-[var(--shadow)] animate-rise">
        <div className="hero-wash pointer-events-none absolute inset-0" aria-hidden />
        <div className="rel