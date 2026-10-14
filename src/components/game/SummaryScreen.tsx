"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kindLabel } from "@/lib/locations";
import { formatDistance } from "@/lib/haversine";
import { MAX_SCORE } from "@/lib/scoring";
import type { RoundResult } from "@/components/game/types";

export function SummaryScreen({
  results,
  total,
  onReplay,
  onHome,
}: {
  results: RoundResult[];
  total: number;
  onReplay: () => void;
  onHome: () => void;
}) {
  const max = results.length * MAX_SCORE;
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 animate-rise">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
        Session complete · Spot the place
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
        Tamil Nadu tour
      </h2>
      <p className="mt-3 text-[var(--muted)]">
        You scored{" "}
        <strong className="tabular-nums text-[var(--fg)]">
          {total.toLocaleString()}
        </strong>{" "}
        of {max.toLocaleString()} across {results.length} places.
      </p>
      <ul className="mt-8 space-y-3">
        {results.map((r, i) => (
          <li
            key={`${r.place.id}-${i}`}
            className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 p-3"
          >
            {r.place.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${r.place.image}`}
                alt=""
                className="h-14 w-14 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] text-xs uppercase tracking-wider text-[var(--muted)]">
                {kindLabel(r.place.kind).slice(0, 3)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[var(--fg)]">
                {i + 1}. {r.place.name}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatDistance(r.distanceKm)} · {r.place.district}
              </p>
            </div>
            <p className="tabular-nums text-[var(--accent)]">
              {r.score.toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="button" size="lg" onClick={onReplay}>
          <RotateCcw className="size-4" />
          Play again
        </Button>
        <Button type="button" size="lg" variant="secondary" onClick={onHome}>
          Back home
        </Button>
      </div>
    </main>
  );
}
