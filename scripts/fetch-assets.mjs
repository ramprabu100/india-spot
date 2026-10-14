/**
 * CI helper: refresh TN district GeoJSON + Spot mode images before static export.
 * Keeps gameplay identical; assets are the same open sources used locally.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "IndiaSpot/1.0 (GitHub Pages build; educational)";

const NAME_FIX = {
  Tiruchchirappalli: "Tiruchirappalli",
  "Tirunelveli Kattabo": "Tirunelveli",
  Kanniyakumari: "Kanyakumari",
  Kancheepuram: "Kanchipuram",
  Thiruvallur: "Tiruvallur",
  Thiruvarur: "Tiruvarur",
  Sivaganga: "Sivagangai",
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

async function buildGeo() {
  const url =
    "https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson";
  console.log("Downloading district boundaries…");
  const data = await fetchJson(url);
  const tn = data.features.filter(
    (f) => String(f.properties?.NAME_1 || "").toLowerCase() === "tamil nadu",
  );
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
  const features = tn.map((f) => {
    const raw = f.properties.NAME_2;
    const name = NAME_FIX[raw] || raw;
    const geometry = simplifyGeom(f.geometry, 6);
    walk(geometry.coordinates);
    return {
      type: "Feature",
      properties: {
        name,
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      },
      geometry,
    };
  });
  const out = {
    type: "FeatureCollection",
    bbox: [minx, miny, maxx, maxy],
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

await buildGeo();
await buildImages();
console.log("Assets ready.");
