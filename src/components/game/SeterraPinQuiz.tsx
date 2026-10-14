"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DistrictPinMap, type DistrictFeature } from "@/components/game/DistrictPinMap";
import {
  MAX_WRONG_ATTEMPTS,
  formatTimer,
  pointsForAttempts,
  resultColor,
  shuffleIds,
  type DistrictResultColor,
} from "@/lib/quizzes";
import type { BBox } from "@/lib/geo-project";
import { assetPath } from "@/lib/utils";

type GeoFile = {
  bbox?: BBox;
  features: {
    properties: { id: string; name: string };
    geometry: GeoJSON.Geometry;
  }[];
  meta?: { source?: string; count?: number };
};

type Props = {
  title: string;
  geoPath: string;
  onExit: () => void;
};

type Phase = "loading" | "error" | "playing" | "done";

export function SeterraPinQuiz({ title, geoPath, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<DistrictFeature[]>([]);
  const [bbox, setBBox] = useState<BBox>([76.2, 8.0, 80.4, 13.6]);
  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [colors, setColors] = useState<Record<string, DistrictResultColor>>({});
  const [flashWrongId, setFlashWrongId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [finishedMs, setFinishedMs] = useState(0);
  const [sourceNote, setSourceNote] = useState<string>("");

  const byId = useMemo(() => {
    const m = new Map<string, DistrictFeature>();
    features.forEach((f) => m.set(f.id, f));
    return m;
  }, [features]);

  const currentId = order[index] ?? null;
  const current = currentId ? byId.get(currentId) : null;
  const total = order.length;
  const accuracy =
    completed === 0 ? 0 : Math.round((points / completed) * 100);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPhase("loading");
        const res = await fetch(assetPath(geoPath));
        if (!res.ok) throw new Error(`Could not load map data (${res.status})`);
        const data = (await res.json()) as GeoFile;
        if (cancelled) return;
        const feats: DistrictFeature[] = data.features.map((f) => ({
          id: f.properties.id,
          name: f.properties.name,
          geometry: f.geometry,
        }));
        if (!feats.length) throw new Error("Map has no districts");
        setFeatures(feats);
        if (data.bbox) setBBox(data.bbox);
        setSourceNote(data.meta?.source ?? "");
        const ids = shuffleIds(feats.map((f) => f.id));
        setOrder(ids);
        setIndex(0);
        setWrong(0);
        setColors({});
        setPoints(0);
        setCompleted(0);
        setStartedAt(Date.now());
        setPhase("playing");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load quiz");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [geoPath]);

  useEffect(() => {
    if (phase !== "playing" || !startedAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [phase, startedAt]);

  const elapsed =
    phase === "done"
      ? finishedMs
      : startedAt
        ? now - startedAt
        : 0;

  const advance = useCallback(
    (id: string, wrongCount: number, failed: boolean) => {
      const color = resultColor(wrongCount, failed);
      const pts = pointsForAttempts(wrongCount, failed);
      setColors((c) => ({ ...c, [id]: color }));
      setPoints((p) => p + pts);
      setCompleted((n) => n + 1);
      setHighlightId(failed ? id : null);
      setWrong(0);

      window.setTimeout(() => {
        setHighlightId(null);
        setIndex((i) => {
          const next = i + 1;
          if (next >= order.length) {
            setFinishedMs(startedAt ? Date.now() - startedAt : 0);
            setPhase("done");
            return i;
          }
          return next;
        });
      }, failed ? 900 : 280);
    },
    [order.length, startedAt],
  );

  const onSelect = useCallback(
    (id: string) => {
      if (phase !== "playing" || !currentId) return;
      if (colors[id] && colors[id] !== "idle") return;

      if (id === currentId) {
        advance(id, wrong, false);
        return;
      }

      // Wrong district
      setFlashWrongId(id);
      window.setTimeout(() => setFlashWrongId(null), 350);
      const nextWrong = wrong + 1;
      setWrong(nextWrong);
      if (nextWrong >= MAX_WRONG_ATTEMPTS) {
        advance(currentId, nextWrong, true);
      }
    },
    [phase, currentId, colors, wrong, advance],
  );

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-4xl flex-col items-center justify-center gap-3 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        <p className="text-sm text-[var(--muted)]">Loading Tamil Nadu districts…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">
          Map quiz unavailable
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{error}</p>
        <Button type="button" className="mt-6" onClick={onExit}>
          Back to catalog
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    const pct = total ? Math.round((points / total) * 100) : 0;
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center animate-rise">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
          Quiz complete
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          {title}
        </h2>
        <p className="mt-6 font-[family-name:var(--font-display)] text-5xl tabular-nums text-[var(--accent)]">
          {pct}%
        </p>
        <p className="mt-2 text-[var(--muted)]">
          Time {formatTimer(elapsed)} · {total} districts
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            size="lg"
            onClick={() => {
              const ids = shuffleIds(features.map((f) => f.id));
              setOrder(ids);
              setIndex(0);
              setWrong(0);
              setColors({});
              setPoints(0);
              setCompleted(0);
              setStartedAt(Date.now());
              setFinishedMs(0);
              setPhase("playing");
            }}
          >
            Play again
          </Button>
          <Button type="button" size="lg" variant="secondary" onClick={onExit}>
            Catalog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 pb-10 sm:px-6 animate-rise">
      {/* Seterra-style status bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-t-xl bg-[#1e3a5f] px-3 py-2.5 text-sm text-white sm:px-4">
        <div className="flex items-center gap-3 tabular-nums">
          <span>
            {completed} / {total}
          </span>
          <span className="text-white/80">{accuracy}%</span>
        </div>
        <p className="min-w-0 flex-1 text-center font-medium sm:text-base">
          Click on{" "}
          <span
            data-testid="seterra-target"
            className="font-[family-name:var(--font-display)] text-lg text-[#f0d9a8]"
          >
            {current?.name ?? "…"}
          </span>
        </p>
        <div className="ml-auto flex items-center gap-3">
          <span className="tabular-nums text-white/90">
            {formatTimer(elapsed)}
          </span>
          <button
            type="button"
            aria-label="Exit quiz"
            className="rounded p-1 hover:bg-white/10"
            onClick={onExit}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="rounded-b-xl border border-[#9bb8d0] border-t-0 bg-[#e8f2ef] p-2 sm:p-4">
        <DistrictPinMap
          features={features}
          bbox={bbox}
          colors={colors}
          flashWrongId={flashWrongId}
          highlightId={highlightId}
          interactive={phase === "playing"}
          onSelect={onSelect}
        />
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm bg-[#7bc67e]" /> First try
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm bg-[#f0c14a]" /> After misses
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm bg-[#e57373]" /> Missed (3 wrong)
          </span>
          {wrong > 0 && current ? (
            <span className="ml-auto text-[#c2410c]">
              Tries left: {MAX_WRONG_ATTEMPTS - wrong}
            </span>
          ) : null}
        </div>
        {sourceNote ? (
          <p className="mt-2 text-[10px] text-[var(--muted)]">Map data: {sourceNote}</p>
        ) : null}
      </div>
    </div>
  );
}
