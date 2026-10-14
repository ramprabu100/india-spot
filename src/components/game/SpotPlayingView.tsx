"use client";

import { MapPin, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanoramaView } from "@/components/game/PanoramaView";
import { ResultPanel } from "@/components/game/ResultPanel";
import { cn } from "@/lib/utils";
import { MAX_SCORE } from "@/lib/scoring";
import type { Place } from "@/lib/locations";
import type { LatLng } from "@/components/game/GuessMap";
import type { RoundResult } from "@/components/game/types";
import type { ComponentType } from "react";

type GuessMapProps = {
  mapKey: string;
  guess: LatLng | null;
  onGuess: (g: LatLng) => void;
  truth: Place | null;
  revealed: boolean;
  interactive: boolean;
  bounds: [[number, number], [number, number]];
};

export function SpotPlayingView({
  place,
  screenKind,
  mapOpen,
  setMapOpen,
  guess,
  setGuess,
  liveName,
  bounds,
  GuessMap,
  results,
  roundIndex,
  deckLength,
  submitGuess,
  nextRound,
}: {
  place: Place;
  screenKind: "spot-playing" | "spot-result";
  mapOpen: boolean;
  setMapOpen: (v: boolean) => void;
  guess: LatLng | null;
  setGuess: (g: LatLng) => void;
  liveName: string;
  bounds: [[number, number], [number, number]];
  GuessMap: ComponentType<GuessMapProps>;
  results: RoundResult[];
  roundIndex: number;
  deckLength: number;
  submitGuess: () => void;
  nextRound: () => void;
}) {
  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-28 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:pb-8">
      <section className="relative animate-rise overflow-hidden rounded-xl border border-[var(--border)] shadow-[var(--shadow)]">
        <PanoramaView place={place} revealed={screenKind === "spot-result"} />
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
          Guess where this place is in {liveName}. Closer pins score higher (max{" "}
          {MAX_SCORE.toLocaleString()}).
        </p>
        <div className="min-h-0 w-full flex-1">
          <GuessMap
            mapKey={`spot-${place.id}-${mapOpen ? "open" : "dock"}`}
            guess={guess}
            onGuess={setGuess}
            truth={screenKind === "spot-result" ? place : null}
            revealed={screenKind === "spot-result"}
            interactive={screenKind === "spot-playing"}
            bounds={bounds}
          />
        </div>

        {screenKind === "spot-playing" && (
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

        {screenKind === "spot-result" && results[results.length - 1] && (
          <div className="relative z-20">
            <ResultPanel
              result={results[results.length - 1]}
              isLast={roundIndex + 1 >= deckLength}
              onNext={nextRound}
            />
          </div>
        )}
      </section>

      {screenKind === "spot-playing" && !mapOpen && (
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
  );
}
