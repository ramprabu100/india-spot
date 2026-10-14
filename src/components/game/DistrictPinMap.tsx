"use client";

import { useMemo } from "react";
import { makeProjector, geometryToPath, type BBox } from "@/lib/geo-project";
import type { DistrictResultColor } from "@/lib/quizzes";
import { cn } from "@/lib/utils";

export type DistrictFeature = {
  id: string;
  name: string;
  geometry: GeoJSON.Geometry;
};

type Props = {
  features: DistrictFeature[];
  bbox: BBox;
  colors: Record<string, DistrictResultColor>;
  flashWrongId: string | null;
  highlightId: string | null;
  interactive: boolean;
  onSelect: (id: string) => void;
};

const FILL: Record<DistrictResultColor, string> = {
  idle: "#b7d4a8",
  green: "#7bc67e",
  yellow: "#f0c14a",
  red: "#e57373",
};

const WIDTH = 720;
const HEIGHT = 860;

export function DistrictPinMap({
  features,
  bbox,
  colors,
  flashWrongId,
  highlightId,
  interactive,
  onSelect,
}: Props) {
  const project = useMemo(
    () => makeProjector(bbox, WIDTH, HEIGHT, 18),
    [bbox],
  );

  const paths = useMemo(
    () =>
      features.map((f) => ({
        ...f,
        d: geometryToPath(f.geometry, project),
      })),
    [features, project],
  );

  return (
    <div className="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-xl border border-[#9bb8d0] bg-[#cfe6f5] shadow-[var(--shadow)]">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full touch-manipulation"
        role="img"
        aria-label="Tamil Nadu districts map"
      >
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#cfe6f5" />
        {paths.map((f) => {
          const color = colors[f.id] ?? "idle";
          const isFlash = flashWrongId === f.id;
          const isHighlight = highlightId === f.id;
          return (
            <path
              key={f.id}
              d={f.d}
              data-district-id={f.id}
              data-district-name={f.name}
              fill={isFlash ? "#ff8a65" : FILL[color]}
              stroke={isHighlight ? "#1e3a5f" : "#5a7a5a"}
              strokeWidth={isHighlight ? 2.4 : 1}
              className={cn(
                "transition-colors duration-150",
                interactive && color === "idle"
                  ? "cursor-pointer hover:brightness-95"
                  : "cursor-default",
              )}
              onClick={() => {
                if (!interactive) return;
                if (color !== "idle") return;
                onSelect(f.id);
              }}
            >
              <title>{color === "idle" && interactive ? "District" : f.name}</title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}
