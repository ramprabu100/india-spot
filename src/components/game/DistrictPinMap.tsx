"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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
  /** Accessible map label */
  mapLabel?: string;
};

const FILL: Record<DistrictResultColor, string> = {
  idle: "#b7d4a8",
  green: "#7bc67e",
  yellow: "#f0c14a",
  red: "#e57373",
};

/** Cap so neighbors stay visible; small regions still enlarge enough to click. */
const MAX_ZOOM = 3.25;
/** Aim for the hovered region to cover roughly this fraction of the shorter axis. */
const TARGET_REGION_FRACTION = 0.28;
/** Per-frame lerp toward the target viewBox (short ease, not a jump). */
const EASE = 0.22;

type ViewBox = { x: number; y: number; w: number; h: number };

function viewSize(bbox: BBox): { width: number; height: number } {
  const [west, south, east, north] = bbox;
  const gw = Math.max(east - west, 0.01);
  const gh = Math.max(north - south, 0.01);
  const aspect = gw / gh;
  // India is wider; TN districts are taller.
  if (aspect >= 0.95) {
    return { width: 820, height: Math.round(820 / aspect) };
  }
  return { width: 720, height: 860 };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function nearlyEqual(a: ViewBox, b: ViewBox, eps = 0.05) {
  return (
    Math.abs(a.x - b.x) < eps &&
    Math.abs(a.y - b.y) < eps &&
    Math.abs(a.w - b.w) < eps &&
    Math.abs(a.h - b.h) < eps
  );
}

/**
 * Pointer-anchored zoom: keep the SVG point under the cursor fixed on screen
 * while changing scale. That is what makes the click hit the region that is
 * visually under the cursor (the usual slide-out failure mode).
 */
function viewBoxForFocus(
  width: number,
  height: number,
  scale: number,
  focusX: number,
  focusY: number,
  fracX: number,
  fracY: number,
): ViewBox {
  const s = Math.max(1, Math.min(MAX_ZOOM, scale));
  const w = width / s;
  const h = height / s;
  let x = focusX - fracX * w;
  let y = focusY - fracY * h;
  // Soft clamp: allow a little ocean padding, keep most of the land in frame.
  const padX = w * 0.15;
  const padY = h * 0.15;
  x = Math.min(Math.max(x, -padX), width - w + padX);
  y = Math.min(Math.max(y, -padY), height - h + padY);
  return { x, y, w, h };
}

function scaleForRegion(
  regionW: number,
  regionH: number,
  mapW: number,
  mapH: number,
): number {
  const regionSpan = Math.max(regionW, regionH, 1);
  const mapSpan = Math.min(mapW, mapH);
  const raw = (TARGET_REGION_FRACTION * mapSpan) / regionSpan;
  return Math.min(MAX_ZOOM, Math.max(1, raw));
}

export function DistrictPinMap({
  features,
  bbox,
  colors,
  flashWrongId,
  highlightId,
  interactive,
  onSelect,
  mapLabel = "Region map",
}: Props) {
  const { width, height } = useMemo(() => viewSize(bbox), [bbox]);
  const project = useMemo(
    () => makeProjector(bbox, width, height, 18),
    [bbox, width, height],
  );

  const paths = useMemo(
    () =>
      features.map((f) => ({
        ...f,
        d: geometryToPath(f.geometry, project),
      })),
    [features, project],
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewBoxRef = useRef<ViewBox>({ x: 0, y: 0, w: width, h: height });
  const targetRef = useRef<ViewBox>({ x: 0, y: 0, w: width, h: height });
  const pointerDownRef = useRef(false);
  const hoverEnabledRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Keep full-size defaults in sync if the map aspect changes (India vs TN).
  useEffect(() => {
    const full = { x: 0, y: 0, w: width, h: height };
    viewBoxRef.current = full;
    targetRef.current = full;
    const svg = svgRef.current;
    if (svg) svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }, [width, height]);

  const tick = useCallback(() => {
    rafRef.current = null;
    const cur = viewBoxRef.current;
    const tgt = targetRef.current;
    if (nearlyEqual(cur, tgt)) {
      viewBoxRef.current = tgt;
      const svg = svgRef.current;
      if (svg) {
        svg.setAttribute(
          "viewBox",
          `${tgt.x} ${tgt.y} ${tgt.w} ${tgt.h}`,
        );
      }
      return;
    }
    const next: ViewBox = {
      x: lerp(cur.x, tgt.x, EASE),
      y: lerp(cur.y, tgt.y, EASE),
      w: lerp(cur.w, tgt.w, EASE),
      h: lerp(cur.h, tgt.h, EASE),
    };
    viewBoxRef.current = next;
    const svg = svgRef.current;
    if (svg) {
      svg.setAttribute("viewBox", `${next.x} ${next.y} ${next.w} ${next.h}`);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const scheduleTick = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const setTarget = useCallback(
    (next: ViewBox) => {
      targetRef.current = next;
      scheduleTick();
    },
    [scheduleTick],
  );

  const resetTarget = useCallback(() => {
    setTarget({ x: 0, y: 0, w: width, h: height });
  }, [setTarget, width, height]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const clientToSvgFocus = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const fracX = (clientX - rect.left) / rect.width;
      const fracY = (clientY - rect.top) / rect.height;
      const vb = viewBoxRef.current;
      const focusX = vb.x + fracX * vb.w;
      const focusY = vb.y + fracY * vb.h;
      return { focusX, focusY, fracX, fracY };
    },
    [],
  );

  const isHoverPointer = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return false;
    if (e.pointerType === "mouse" || e.pointerType === "pen") return true;
    // Some automation sends empty pointerType; allow only fine-hover devices.
    if (typeof window === "undefined") return false;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  };

  const onPointerEnter = (e: React.PointerEvent<SVGSVGElement>) => {
    // Fine pointer + hover only. Touch has no hover; leave tap alone.
    hoverEnabledRef.current = isHoverPointer(e);
  };

  const onPointerLeave = () => {
    hoverEnabledRef.current = false;
    if (!pointerDownRef.current) resetTarget();
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isHoverPointer(e)) {
      // Touch: do not engage hover zoom at all.
      hoverEnabledRef.current = false;
      resetTarget();
      return;
    }
    // Freeze zoom in place while a click is in progress so the target
    // cannot slide out from under the pointer (the usual failure).
    pointerDownRef.current = true;
    targetRef.current = { ...viewBoxRef.current };
  };

  const onPointerUp = () => {
    pointerDownRef.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isHoverPointer(e)) return;
    hoverEnabledRef.current = true;
    if (pointerDownRef.current) return;

    const focus = clientToSvgFocus(e.clientX, e.clientY);
    if (!focus) return;

    const el = e.target as Element | null;
    const path =
      el && el instanceof SVGPathElement && el.dataset.districtId
        ? el
        : null;

    if (!path) {
      // Ocean / empty: ease back to the full outline.
      resetTarget();
      return;
    }

    let regionW = 0;
    let regionH = 0;
    try {
      const b = path.getBBox();
      regionW = b.width;
      regionH = b.height;
    } catch {
      resetTarget();
      return;
    }

    // Always follow over land. Large states stay near 1×; small ones
    // ramp up (capped). Do NOT hard-reset on large states — that canceled
    // zoom before the pointer could settle on Sikkim/Goa/Chennai.
    const scale = scaleForRegion(regionW, regionH, width, height);
    setTarget(
      viewBoxForFocus(
        width,
        height,
        scale,
        focus.focusX,
        focus.focusY,
        focus.fracX,
        focus.fracY,
      ),
    );
  };

  return (
    <div className="relative mx-auto w-full max-w-[820px] overflow-hidden rounded-xl border border-[#9bb8d0] bg-[#cfe6f5] shadow-[var(--shadow)]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full touch-manipulation"
        role="img"
        aria-label={mapLabel}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerMove={onPointerMove}
      >
        <rect x="0" y="0" width={width} height={height} fill="#cfe6f5" />
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
              <title>
                {color === "idle" && interactive ? "Region" : f.name}
              </title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}
