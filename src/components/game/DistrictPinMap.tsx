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
/**
 * First-order camera time constant (seconds). Longer = glide, not chase.
 * Exponential smoothing has no overshoot (critically-damped-like feel).
 */
const CAMERA_TAU = 0.28;
/** Low-pass the raw pointer so pixel noise does not re-pan every move. */
const POINTER_TAU = 0.07;
/**
 * Halo for approaching small regions (Sikkim/Goa/Chennai). Kept modest so
 * it does not yank the camera between neighbors on every pixel.
 */
const PROXIMITY_PX = 28;
const MAGNET_MIN_SCALE = 1.45;
/** Stay locked to the current region while the pointer is this close to it. */
const REGION_HOLD_PX = 18;
/** Ignore scale retargets smaller than this while still "engaged". */
const SCALE_EPS = 0.08;

type ViewBox = { x: number; y: number; w: number; h: number };

type CamState = {
  rawX: number;
  rawY: number;
  smoothX: number;
  smoothY: number;
  hasPointer: boolean;
  lockedId: string | null;
  lockedScale: number;
  /** Desired viewBox (updated from smoothed pointer + locked scale). */
  desired: ViewBox;
  /** Displayed viewBox (eased toward desired). */
  current: ViewBox;
  pointerDown: boolean;
  hoverActive: boolean;
  lastTs: number;
  raf: number | null;
};

function viewSize(bbox: BBox): { width: number; height: number } {
  const [west, south, east, north] = bbox;
  const gw = Math.max(east - west, 0.01);
  const gh = Math.max(north - south, 0.01);
  const aspect = gw / gh;
  if (aspect >= 0.95) {
    return { width: 820, height: Math.round(820 / aspect) };
  }
  return { width: 720, height: 860 };
}

function fullView(width: number, height: number): ViewBox {
  return { x: 0, y: 0, w: width, h: height };
}

function expAlpha(dt: number, tau: number) {
  // 1 - e^(-dt/tau): time-based ease, no overshoot, frame-rate independent.
  return 1 - Math.exp(-Math.max(dt, 0) / Math.max(tau, 0.001));
}

function nearlyEqual(a: ViewBox, b: ViewBox, eps = 0.04) {
  return (
    Math.abs(a.x - b.x) < eps &&
    Math.abs(a.y - b.y) < eps &&
    Math.abs(a.w - b.w) < eps &&
    Math.abs(a.h - b.h) < eps
  );
}

/**
 * Pointer-anchored zoom: keep the SVG point under the cursor fixed on screen
 * while changing scale so the click hits the region visually under the cursor.
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

function distToRect(
  x: number,
  y: number,
  r: { left: number; top: number; right: number; bottom: number },
) {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
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
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };

  const camRef = useRef<CamState | null>(null);
  if (!camRef.current) {
    const full = fullView(width, height);
    camRef.current = {
      rawX: 0,
      rawY: 0,
      smoothX: 0,
      smoothY: 0,
      hasPointer: false,
      lockedId: null,
      lockedScale: 1,
      desired: full,
      current: full,
      pointerDown: false,
      hoverActive: false,
      lastTs: 0,
      raf: null,
    };
  }

  const applyViewBox = useCallback((vb: ViewBox) => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }, []);

  const clientToFocus = useCallback(
    (clientX: number, clientY: number, vb: ViewBox) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const fracX = (clientX - rect.left) / rect.width;
      const fracY = (clientY - rect.top) / rect.height;
      return {
        focusX: vb.x + fracX * vb.w,
        focusY: vb.y + fracY * vb.h,
        fracX,
        fracY,
      };
    },
    [],
  );

  /** Resolve which region drives zoom — sticky while pointer stays nearby. */
  const resolveRegion = useCallback(
    (
      clientX: number,
      clientY: number,
      lockedId: string | null,
    ): { id: string | null; scale: number; engage: boolean } => {
      const svg = svgRef.current;
      const { width: mapW, height: mapH } = sizeRef.current;
      if (!svg) return { id: null, scale: 1, engage: false };

      const pathScale = (p: SVGPathElement) => {
        try {
          const b = p.getBBox();
          return {
            scale: scaleForRegion(b.width, b.height, mapW, mapH),
            span: Math.max(b.width, b.height, 1),
          };
        } catch {
          return { scale: 1, span: Infinity };
        }
      };

      const hit = document.elementFromPoint(clientX, clientY);
      const direct =
        hit instanceof SVGPathElement &&
        hit.dataset.districtId &&
        svg.contains(hit)
          ? hit
          : null;

      // Direct hit always wins — sticky hold must not trap the camera on a
      // large neighbor when the pointer moves onto Sikkim/Goa/Chennai.
      if (direct) {
        const { scale } = pathScale(direct);
        return {
          id: direct.dataset.districtId ?? null,
          scale,
          engage: true,
        };
      }

      // No direct hit: keep the locked region while nearby (ocean gaps / edges).
      if (lockedId) {
        const locked = svg.querySelector(
          `path[data-district-id="${lockedId}"]`,
        ) as SVGPathElement | null;
        if (locked) {
          const r = locked.getBoundingClientRect();
          if (distToRect(clientX, clientY, r) <= REGION_HOLD_PX) {
            const { scale } = pathScale(locked);
            return { id: lockedId, scale, engage: true };
          }
        }
      }

      // Modest proximity magnet for tiny regions only (not every neighbor).
      let best: { id: string; scale: number; span: number } | null = null;
      const nodes = svg.querySelectorAll("path[data-district-id]");
      for (let i = 0; i < nodes.length; i++) {
        const p = nodes[i] as SVGPathElement;
        const r = p.getBoundingClientRect();
        if (distToRect(clientX, clientY, r) > PROXIMITY_PX) continue;
        const { scale, span } = pathScale(p);
        if (scale < MAGNET_MIN_SCALE) continue;
        if (!best || span < best.span) {
          best = { id: p.dataset.districtId!, scale, span };
        }
      }
      if (best) return { id: best.id, scale: best.scale, engage: true };

      return { id: null, scale: 1, engage: false };
    },
    [],
  );

  const tick = useCallback(
    (ts: number) => {
      const cam = camRef.current!;
      cam.raf = null;
      const { width: mapW, height: mapH } = sizeRef.current;
      const dt =
        cam.lastTs === 0 ? 1 / 60 : Math.min(0.05, (ts - cam.lastTs) / 1000);
      cam.lastTs = ts;

      // Freeze everything while a click is in progress.
      if (cam.pointerDown) {
        applyViewBox(cam.current);
        return;
      }

      if (cam.hoverActive && cam.hasPointer) {
        const pA = expAlpha(dt, POINTER_TAU);
        cam.smoothX += (cam.rawX - cam.smoothX) * pA;
        cam.smoothY += (cam.rawY - cam.smoothY) * pA;

        const resolved = resolveRegion(
          cam.smoothX,
          cam.smoothY,
          cam.lockedId,
        );

        if (!resolved.engage) {
          cam.lockedId = null;
          cam.lockedScale = 1;
          cam.desired = fullView(mapW, mapH);
        } else {
          // Retarget zoom only when the region changes (or scale jumps).
          if (resolved.id !== cam.lockedId) {
            cam.lockedId = resolved.id;
            cam.lockedScale = resolved.scale;
          } else if (
            Math.abs(resolved.scale - cam.lockedScale) > SCALE_EPS &&
            // Only allow scale bump when magnet/direct clearly wants more zoom
            // (e.g. entering a tiny exclave), not noise.
            resolved.scale > cam.lockedScale + SCALE_EPS
          ) {
            cam.lockedScale = resolved.scale;
          }
          // Same region: hold zoom, pan gently via updated focus only.
          const focus = clientToFocus(
            cam.smoothX,
            cam.smoothY,
            cam.current,
          );
          if (focus) {
            cam.desired = viewBoxForFocus(
              mapW,
              mapH,
              cam.lockedScale,
              focus.focusX,
              focus.focusY,
              focus.fracX,
              focus.fracY,
            );
          }
        }
      } else {
        cam.lockedId = null;
        cam.lockedScale = 1;
        cam.desired = fullView(mapW, mapH);
      }

      const cA = expAlpha(dt, CAMERA_TAU);
      const cur = cam.current;
      const des = cam.desired;
      const next: ViewBox = {
        x: cur.x + (des.x - cur.x) * cA,
        y: cur.y + (des.y - cur.y) * cA,
        w: cur.w + (des.w - cur.w) * cA,
        h: cur.h + (des.h - cur.h) * cA,
      };
      // Snap when close enough so the full-outline rest pose is exact.
      if (nearlyEqual(next, des, 4)) {
        cam.current = des;
      } else {
        cam.current = next;
      }
      applyViewBox(cam.current);

      const stillMoving =
        cam.hoverActive ||
        !nearlyEqual(cam.current, fullView(mapW, mapH)) ||
        !nearlyEqual(cam.current, cam.desired);
      if (stillMoving || cam.hoverActive) {
        cam.raf = requestAnimationFrame(tick);
      } else {
        cam.lastTs = 0;
      }
    },
    [applyViewBox, clientToFocus, resolveRegion],
  );

  const ensureLoop = useCallback(() => {
    const cam = camRef.current!;
    if (cam.raf != null) return;
    cam.lastTs = 0;
    cam.raf = requestAnimationFrame(tick);
  }, [tick]);

  // Reset camera when map aspect changes (India vs TN).
  useEffect(() => {
    const full = fullView(width, height);
    const cam = camRef.current!;
    cam.desired = full;
    cam.current = full;
    cam.lockedId = null;
    cam.lockedScale = 1;
    applyViewBox(full);
  }, [width, height, applyViewBox]);

  useEffect(() => {
    return () => {
      const cam = camRef.current;
      if (cam?.raf != null) cancelAnimationFrame(cam.raf);
    };
  }, []);

  const setRawPointer = useCallback(
    (clientX: number, clientY: number) => {
      const cam = camRef.current!;
      if (!cam.hasPointer) {
        cam.smoothX = clientX;
        cam.smoothY = clientY;
        cam.hasPointer = true;
      }
      cam.rawX = clientX;
      cam.rawY = clientY;
      ensureLoop();
    },
    [ensureLoop],
  );

  const leaveMap = useCallback(() => {
    const cam = camRef.current!;
    cam.hoverActive = false;
    cam.hasPointer = false;
    cam.lockedId = null;
    cam.lockedScale = 1;
    if (!cam.pointerDown) {
      cam.desired = fullView(sizeRef.current.width, sizeRef.current.height);
      ensureLoop();
    }
  }, [ensureLoop]);

  const isHoverPointer = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return false;
    if (e.pointerType === "mouse" || e.pointerType === "pen") return true;
    if (typeof window === "undefined") return false;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  };

  const onPointerEnter = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isHoverPointer(e)) return;
    camRef.current!.hoverActive = true;
    setRawPointer(e.clientX, e.clientY);
  };

  const onPointerLeave = () => {
    leaveMap();
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const cam = camRef.current!;
    if (!isHoverPointer(e)) {
      cam.hoverActive = false;
      leaveMap();
      return;
    }
    // Freeze the displayed view so the click cannot slide off the target.
    cam.pointerDown = true;
    cam.desired = { ...cam.current };
    if (cam.raf != null) {
      cancelAnimationFrame(cam.raf);
      cam.raf = null;
    }
    applyViewBox(cam.current);
  };

  const onPointerUp = () => {
    const cam = camRef.current!;
    cam.pointerDown = false;
    ensureLoop();
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isHoverPointer(e)) return;
    camRef.current!.hoverActive = true;
    setRawPointer(e.clientX, e.clientY);
  };

  // Mouse-only path (never fires for touch).
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    camRef.current!.hoverActive = true;
    setRawPointer(e.clientX, e.clientY);
  };

  const onMouseLeave = () => {
    leaveMap();
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
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
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
