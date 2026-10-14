"use client";

import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/haversine";
import { MAX_SCORE, scoreLabel } from "@/lib/scoring";
import type { RoundResult } from "@/components/game/types";

export function ResultPanel({
  result,
  isLast,
  onNext,
}: {
  result: RoundResult;
  isLast: boolean;
  onNext: () => void;
}) {
  return (
    <div className="animate-rise rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        {scoreLabel(result.score)}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tabular-nums text-[var(--accent)]">
        {result.score.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-[var(--muted)]">
          / {MAX_SCORE.toLocaleString()}
        </span>
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {formatDistance(result.distanceKm)} from{" "}
        <span className="text-[var(--fg)]">{result.place.name}</span>
      </p>
      <Button type="button" className="mt-4 w-full" size="lg" onClick={onNext}>
        {isLast ? "See session score" : "Next round"}
      </Button>
    </div>
  );
}
