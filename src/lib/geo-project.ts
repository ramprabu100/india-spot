export type BBox = [number, number, number, number]; // west, south, east, north

export type Ring = [number, number][];

/** Project lon/lat into SVG viewBox coordinates (y down). */
export function makeProjector(bbox: BBox, width: number, height: number, pad = 12) {
  const [west, south, east, north] = bbox;
  const gw = east - west || 1;
  const gh = north - south || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const scale = Math.min(innerW / gw, innerH / gh);
  const ox = pad + (innerW - gw * scale) / 2;
  const oy = pad + (innerH - gh * scale) / 2;

  return (lon: number, lat: number): [number, number] => {
    const x = ox + (lon - west) * scale;
    const y = oy + (north - lat) * scale;
    return [x, y];
  };
}

export function ringToPath(ring: Ring, project: (lon: number, lat: number) => [number, number]): string {
  if (!ring.length) return "";
  return ring
    .map(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

export function geometryToPath(
  geometry: GeoJSON.Geometry,
  project: (lon: number, lat: number) => [number, number],
): string {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) => ringToPath(ring as Ring, project)).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .flatMap((poly) => poly.map((ring) => ringToPath(ring as Ring, project)))
      .join(" ");
  }
  return "";
}
