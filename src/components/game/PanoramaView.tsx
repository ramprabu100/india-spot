"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assetPath } from "@/lib/utils";
import type { Place } from "@/lib/locations";

type Props = {
  place: Place;
  revealed: boolean;
};

export function PanoramaView({ place, revealed }: Props) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const src = place.image ? assetPath(place.image) : "";

  useEffect(() => {
    setOffset({ x: 0, y: 0 });
    if (!place.image) {
      setStatus("error");
      return;
    }
    setStatus("loading");
  }, [place.id, place.image]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({
      x: Math.max(-120, Math.min(120, o.x + dx * 0.35)),
      y: Math.max(-60, Math.min(60, o.y + dy * 0.25)),
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="relative h-full min-h-[42vh] w-full overflow-hidden bg-[var(--panorama-fallback)]">
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--panorama-fallback)]">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"
            aria-hidden
          />
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--muted)]">
            Loading place view…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--panorama-fallback)] px-6 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl text-[var(--fg)]">
            View unavailable
          </p>
          <p className="max-w-sm text-sm text-[var(--muted)]">
            Could not load this place image. You can still guess from the
            atmosphere clue and map.
          </p>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={
          revealed
            ? `${place.name}, ${place.district}`
            : "Mystery place in Tamil Nadu"
        }
        draggable={false}
        className="absolute inset-0 h-[120%] w-[140%] max-w-none select-none object-cover transition-opacity duration-500"
        style={{
          transform: `translate(calc(-10% + ${offset.x}px), calc(-8% + ${offset.y}px)) scale(1.05)`,
          opacity: status === "ready" ? 1 : 0,
          cursor: dragging.current ? "grabbing" : "grab",
        }}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--ink)]/55 via-transparent to-[var(--ink)]/25" />

      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-6">
        {place.atmosphere ? (
          <p className="max-w-xl font-[family-name:var(--font-body)] text-sm leading-relaxed text-white/90 drop-shadow sm:text-base">
            {place.atmosphere}
          </p>
        ) : null}
        {revealed && (
          <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-[var(--sand)] sm:text-2xl">
            {place.name}
            <span className="ml-2 text-sm font-normal text-white/70 sm:text-base">
              {place.district}, {place.state}
            </span>
          </p>
        )}
        <p className="mt-2 text-[10px] text-white/45 sm:text-xs">
          Drag to look around
          {place.credit ? ` · ${place.credit}` : ""}
        </p>
      </div>
    </div>
  );
}
