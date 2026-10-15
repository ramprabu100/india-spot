/**
 * CI helper: refresh TN district + India state GeoJSON and Spot images before static export.
 * Keeps gameplay identical; assets are the same open sources used locally.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "IndiaSpot/1.0 (GitHub Pages build; educational)";

const TN_NAME_FIX = {
  Tiruchchirappalli: "Tiruchirappalli",
  "Tirunelveli Kattabo": "Tirunelveli",
  Kanniyakumari: "Kanyakumari",
  Kancheepuram: "Kanchipuram",
  Thiruvallur: "Tiruvallur",
  Thiruvarur: "Tiruvarur",
  Sivaganga: "Sivagangai",
};

const STATE_NAME_FIX = {
  Orissa: "Odisha",
  Uttaranchal: "Uttarakhand",
  "Andaman and Nicobar": "Andaman and Nicobar Islands",
};

const IMAGES = [
  ["marina-chennai", "Marina Beach Chennai"],
  ["meenakshi-madurai", "Meenakshi Temple Madurai gopuram"],
  ["shore-mahabalipuram", "Shore Temple Mahabalipuram"],
  ["brihadeeswarar-thanjavur", "Brihadeeswarar Temple Thanjavur"],
  ["ooty-lake", "Ooty Lake"],
  ["kanyakumari", "Vivekananda Rock Memorial Kanyakumari"],
  ["rameswaram", "Ramanathaswamy Temple Rameswaram"],
  ["coimbatore", "Marudamalai Temple Coimbatore"],
];

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function fetchBuf(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeBBoxWalker() {
  let minx = 1e9,
    miny = 1e9,
    maxx = -1e9,
    maxy = -1e9;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      minx = Math.min(minx, c[0]);
      maxx = Math.max(maxx, c[0]);
      miny = Math.min(miny, c[1]);
      maxy = Math.max(maxy, c[1]);
    } else c.forEach(walk);
  };
  return {
    walk,
    bbox: () => [minx, miny, maxx, maxy],
  };
}

function simplifyRing(ring, step) {
  if (ring.length <= 4 || step <= 1) return ring;
  const out = ring.filter((_, i) => i % step === 0 || i === ring.length - 1);
  if (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1]) {
    out.push(out[0]);
  }
  return out;
}

function simplifyGeom(geom, step) {
  const g = structuredClone(geom);
  if (g.type === "Polygon") {
    g.coordinates = g.coordinates.map((r) => simplifyRing(r, step));
  } else if (g.type === "MultiPolygon") {
    g.coordinates = g.coordinates.map((poly) =>
      poly.map((r) => simplifyRing(r, step)),
    );
  }
  return g;
}

function perpDist(a, b, p) {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [px, py] = p;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function subsampleRing(ring, maxPts) {
  if (ring.length <= maxPts) return ring;
  const step = Math.max(1, Math.floor((ring.length - 1) / (maxPts - 1)));
  const out = [];
  for (let i = 0; i < ring.length - 1; i += step) out.push(ring[i]);
  if (out[out.length - 1] !== ring[ring.length - 1]) out.push(ring[ring.length - 1]);
  if (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1]) {
    out.push(out[0]);
  }
  return out;
}

function roundRing(ring, nd = 3) {
  return ring.map(([lon, lat]) => [Number(lon.toFixed(nd)), Number(lat.toFixed(nd))]);
}

function dpRing(ring, epsilon) {
  if (ring.length <= 4) return roundRing(ring);
  const rec = (pts) => {
    if (pts.length <= 2) return pts;
    const a = pts[0];
    const b = pts[pts.length - 1];
    let idx = 1;
    let best = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpDist(a, b, pts[i]);
      if (d > best) {
        best = d;
        idx = i;
      }
    }
    if (best > epsilon) {
      const left = rec(pts.slice(0, idx + 1));
      const right = rec(pts.slice(idx));
      return left.slice(0, -1).concat(right);
    }
    return [a, b];
  };
  let out = rec(ring);
  if (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1]) {
    out.push(out[0]);
  }
  if (out.length < 4) out = subsampleRing(ring, 32);
  if (out.length > 80) out = subsampleRing(out, 64);
  return roundRing(out);
}

function simplifyGeomDp(geom, epsilon) {
  const g = structuredClone(geom);
  if (g.type === "Polygon") {
    g.coordinates = g.coordinates.map((r) => dpRing(r, epsilon));
  } else if (g.type === "MultiPolygon") {
    g.coordinates = g.coordinates.map((poly) =>
      poly.map((r) => dpRing(r, epsilon)),
    );
  }
  return g;
}

async function buildTnDistricts() {
  const url =
    "https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson";
  console.log("Downloading district boundaries...");
  const data = await fetchJson(url);
  const tn = data.features.filter(
    (f) => String(f.properties?.NAME_1 || "").toLowerCase() === "tamil nadu",
  );
  const { walk, bbox } = makeBBoxWalker();
  const features = tn.map((f) => {
    const raw = f.properties.NAME_2;
    const name = TN_NAME_FIX[raw] || raw;
    const geometry = simplifyGeom(f.geometry, 6);
    walk(geometry.coordinates);
    return {
      type: "Feature",
      properties: { name, id: slugify(name) },
      geometry,
    };
  });
  const out = {
    type: "FeatureCollection",
    bbox: bbox(),
    meta: {
      source: "https://github.com/geohacker/india — district/india_district.geojson",
      license_note:
        "Open community boundaries derived from public GADM-style data; simplified for web quiz use.",
      region: "Tamil Nadu",
      count: features.length,
    },
    features,
  };
  const path = join(root, "public/geo/tn-districts.geojson");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(out));
  console.log(`Wrote ${features.length} districts -> ${path}`);
}

async function buildIndiaStates() {
  const url =
    "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson";
  console.log("Downloading India state / UT boundaries...");
  const data = await fetchJson(url);
  const { walk, bbox } = makeBBoxWalker();
  const features = data.features.map((f) => {
    const raw = f.properties.NAME_1;
    const name = STATE_NAME_FIX[raw] || raw;
    const geometry = simplifyGeomDp(f.geometry, 0.04);
    walk(geometry.coordinates);
    return {
      type: "Feature",
      properties: { name, id: slugify(name) },
      geometry,
    };
  });
  const out = {
    type: "FeatureCollection",
    bbox: bbox().map((n) => Number(n.toFixed(4))),
    meta: {
      source: "https://github.com/geohacker/india — state/india_state.geojson",
      license_note:
        "Open community boundaries derived from public GADM-style data; simplified for web quiz use.",
      region: "India",
      count: features.length,
    },
    features,
  };
  const path = join(root, "public/geo/india-states.geojson");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(out));
  console.log(`Wrote ${features.length} states/UTs -> ${path}`);
}

async function buildImages() {
  const dir = join(root, "public/locations");
  mkdirSync(dir, { recursive: true });
  for (const [slug, q] of IMAGES) {
    const dest = join(dir, `${slug}.jpg`);
    if (existsSync(dest) && (await import("node:fs")).statSync(dest).size > 50_000) {
      console.log(`Keep ${slug}.jpg`);
      continue;
    }
    const api =
      "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        format: "json",
        generator: "search",
        gsrsearch: q,
        gsrlimit: "5",
        gsrnamespace: "6",
        prop: "imageinfo",
        iiprop: "url|mime",
        iiurlwidth: "1280",
      });
    const data = await fetchJson(api);
    const pages = Object.values(data.query?.pages || {});
    let url = null;
    for (const p of pages) {
      const info = (p.imageinfo || [])[0];
      if (info?.thumburl || info?.url) {
        url = info.thumburl || info.url;
        break;
      }
    }
    if (!url) {
      console.warn(`No image for ${slug}`);
      continue;
    }
    const buf = await fetchBuf(url);
    writeFileSync(dest, buf);
    console.log(`Wrote ${slug}.jpg (${buf.length} bytes)`);
  }
}

await buildTnDistricts();
await buildIndiaStates();
await buildImages();
console.log("Assets ready.");
