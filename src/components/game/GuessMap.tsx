"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "@/lib/locations";

export type LatLng = { lat: number; lng: number };

type Props = {
  guess: LatLng | null;
  onGuess: (point: LatLng) => void;
  truth: Place | null;
  revealed: boolean;
  interactive: boolean;
  /** SW / NE bounds for Tamil Nadu focus */
  bounds: [[number, number], [number, number]];
  /** Remount key so each round gets a fresh, correctly sized map */
  mapKey: string;
};

function guessIcon() {
  return L.divIcon({
    className: "india-spot-pin",
    html: `<span style="display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;background:#e85d04;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}

function truthIcon() {
  return L.divIcon({
    className: "india-spot-pin",
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#0d9488;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/** Keep Leaflet in sync when the flex/layout container changes size. */
function MapSizeFix() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const refresh = () => map.invalidateSize({ animate: false });
    refresh();
    const raf = requestAnimationFrame(refresh);
    const t1 = window.setTimeout(refresh, 50);
    const t2 = window.setTimeout(refresh, 250);
    const ro = new ResizeObserver(refresh);
    ro.observe(container);
    window.addEventListener("resize", refresh);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, [map]);
  return null;
}

function ClickHandler({
  onGuess,
  enabled,
}: {
  onGuess: (p: LatLng) => void;
  enabled: boolean;
}) {
  const onGuessRef = useRef(onGuess);
  const enabledRef = useRef(enabled);
  onGuessRef.current = onGuess;
  enabledRef.current = enabled;

  const map = useMap();
  useEffect(() => {
    if (enabled) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.getContainer().style.pointerEvents = "auto";
    } else {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      // Keep paneless chrome from eating clicks meant for score actions below.
      map.getContainer().style.pointerEvents = "auto";
    }
  }, [enabled, map]);

  useMapEvents({
    click(e) {
      if (!enabledRef.current) return;
      onGuessRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitOnReveal({
  guess,
  truth,
  revealed,
  bounds,
}: {
  guess: LatLng | null;
  truth: Place | null;
  revealed: boolean;
  bounds: [[number, number], [number, number]];
}) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ animate: false });
    if (revealed && guess && truth) {
      const group = L.latLngBounds([
        [guess.lat, guess.lng],
        [truth.lat, truth.lng],
      ]);
      map.fitBounds(group.pad(0.35), { animate: true, maxZoom: 9 });
    } else {
      map.fitBounds(bounds, { animate: false, padding: [24, 24] });
    }
  }, [revealed, guess, truth, bounds, map]);
  return null;
}

export function GuessMap({
  guess,
  onGuess,
  truth,
  revealed,
  interactive,
  bounds,
  mapKey,
}: Props) {
  const center = useMemo(() => {
    const [[s, w], [n, e]] = bounds;
    return { lat: (s + n) / 2, lng: (w + e) / 2 };
  }, [bounds]);

  const line =
    revealed && guess && truth
      ? [
          [guess.lat, guess.lng] as [number, number],
          [truth.lat, truth.lng] as [number, number],
        ]
      : null;

  return (
    <div className="relative h-[min(52vh,420px)] w-full overflow-hidden rounded-lg border border-[var(--border)] shadow-inner lg:h-[min(56vh,480px)]">
      <MapContainer
        key={mapKey}
        center={[center.lat, center.lng]}
        zoom={7}
        className={`h-full w-full [&_.leaflet-control-attribution]:text-[10px] ${
          interactive ? "cursor-crosshair" : "cursor-default"
        }`}
        scrollWheelZoom
        style={{ background: "var(--map-bg)", height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSizeFix />
        <ClickHandler onGuess={onGuess} enabled={interactive} />
        <FitOnReveal
          guess={guess}
          truth={truth}
          revealed={revealed}
          bounds={bounds}
        />
        {guess && (
          <Marker position={[guess.lat, guess.lng]} icon={guessIcon()} />
        )}
        {revealed && truth && (
          <Marker position={[truth.lat, truth.lng]} icon={truthIcon()} />
        )}
        {line && (
          <Polyline
            positions={line}
            pathOptions={{
              color: "#0f766e",
              weight: 2.5,
              dashArray: "6 8",
              opacity: 0.9,
            }}
          />
        )}
      </MapContainer>
      {!guess && interactive && (
        <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md bg-[var(--ink)]/75 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm">
          Tap the map to drop your pin
        </div>
      )}
    </div>
  );
}
