"use client";

import { Camera, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REGIONS } from "@/lib/locations";
import { SPOT_MODE } from "@/lib/modes";
import { QUIZZES, type QuizDef, type QuizModeId } from "@/lib/quizzes";
import { cn } from "@/lib/utils";

export function HomeScreen({
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
        <div className="relative z-10 grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="mb-3 font-[family-name:var(--font-body)] text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
              Geography games · India
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl leading-[1.05] tracking-tight text-[var(--fg)] sm:text-5xl md:text-6xl">
              India Spot
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Spot places from photos, or play classic Seterra-style Pin quizzes
              on a Tamil Nadu district map.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/locations/shore-mahabalipuram.jpg`}
              alt="Shore Temple silhouette along the Tamil Nadu coast"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/50 to-transparent" />
            <p className="absolute bottom-3 left-3 right-3 text-sm text-white/90">
              Photo Spot · vector Pin quizzes · no API keys
            </p>
          </div>
        </div>
      </div>

      {/* GeoGuessr-style Spot */}
      <section className="mt-12">
        <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--fg)]">
          Spot the place
        </h3>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          GeoGuessr-style: photo clue, pin on an OpenStreetMap basemap, score by
          distance.
        </p>
        <div className="mt-5 flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Camera className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" />
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg">
                {SPOT_MODE.title}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{SPOT_MODE.blurb}</p>
            </div>
          </div>
          <Button type="button" size="lg" onClick={onStartSpot}>
            Play Spot · TN
          </Button>
        </div>
      </section>

      {/* Seterra-style catalog */}
      <section id="quizzes" className="mt-14 scroll-mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--fg)]">
              Map quizzes
            </h3>
            <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
              Seterra-style Pin: click the named region on a clean vector map.
              Accuracy % and time — not distance.
            </p>
          </div>
          <Crosshair className="hidden size-6 text-[var(--accent)] sm:block" />
        </div>

        <ul className="mt-6 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]/70">
          {QUIZZES.map((quiz) => (
            <li
              key={quiz.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-[family-name:var(--font-display)] text-lg text-[var(--fg)]">
                    {quiz.title}
                  </p>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider",
                      quiz.status === "live"
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted)]",
                    )}
                  >
                    {quiz.status === "live" ? "Playable" : "Placeholder"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{quiz.blurb}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {quiz.modes.map((mode) => {
                  const livePin =
                    quiz.status === "live" && mode === "pin" && quiz.geoPath;
                  const label =
                    mode === "pin" ? "Pin" : mode === "type" ? "Type" : "Place";
                  return (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={livePin ? "default" : "secondary"}
                      disabled={!livePin}
                      onClick={() => onStartQuiz(quiz, mode)}
                    >
                      {label}
                      {!livePin ? " · soon" : ""}
                    </Button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="regions" className="mt-14 scroll-mt-8">
        <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--fg)]">
          Region packs
        </h3>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          Tamil Nadu is live. Other Indian regions stay placeholders.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REGIONS.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-[family-name:var(--font-display)] text-lg">
                  {r.name}
                </p>
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    r.status === "live"
                      ? "text-[var(--accent)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {r.status === "live" ? "Playable" : "Placeholder"}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{r.blurb}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
