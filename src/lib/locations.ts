export type PlaceStatus = "live" | "coming-soon";

export type PlaceKind = "landmark" | "city" | "district" | "feature";

export type Place = {
  id: string;
  name: string;
  district: string;
  state: string;
  regionId: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  /** Present for Spot mode; optional for Pin-only entries. */
  image?: string;
  credit?: string;
  /** Short vibe line for Spot mode — no spoilers. */
  atmosphere?: string;
};

export type Region = {
  id: string;
  name: string;
  shortName: string;
  status: PlaceStatus;
  blurb: string;
  /** Map bounds hint for the guess map (SW / NE). */
  bounds?: [[number, number], [number, number]];
};

export const REGIONS: Region[] = [
  {
    id: "tamil-nadu",
    name: "Tamil Nadu",
    shortName: "TN",
    status: "live",
    blurb: "Coastal temples, hill stations, and Coromandel shorelines.",
    bounds: [
      [8.0, 76.2],
      [13.6, 80.4],
    ],
  },
  {
    id: "kerala",
    name: "Kerala",
    shortName: "KL",
    status: "coming-soon",
    blurb: "Backwaters and Western Ghats — placeholder for a future pack.",
  },
  {
    id: "karnataka",
    name: "Karnataka",
    shortName: "KA",
    status: "coming-soon",
    blurb: "Deccan plateaus and heritage cities — coming later.",
  },
  {
    id: "rajasthan",
    name: "Rajasthan",
    shortName: "RJ",
    status: "coming-soon",
    blurb: "Desert forts and pink cities — not playable yet.",
  },
  {
    id: "maharashtra",
    name: "Maharashtra",
    shortName: "MH",
    status: "coming-soon",
    blurb: "Konkan coast and Deccan — placeholder slot.",
  },
  {
    id: "delhi-ncr",
    name: "Delhi NCR",
    shortName: "DL",
    status: "coming-soon",
    blurb: "Capital sprawl — planned pack, not available yet.",
  },
];

/** Tamil Nadu places — landmarks with photos (Spot + Pin) and extra name targets (Pin). */
export const TN_PLACES: Place[] = [
  {
    id: "marina-chennai",
    name: "Marina Beach",
    district: "Chennai",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "feature",
    lat: 13.0505,
    lng: 80.2824,
    image: "/locations/marina-chennai.jpg",
    credit: "Wikimedia Commons — Cloudy Marina beach",
    atmosphere: "A long urban shoreline under a wide, open sky.",
  },
  {
    id: "meenakshi-madurai",
    name: "Meenakshi Amman Temple",
    district: "Madurai",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "landmark",
    lat: 9.9195,
    lng: 78.1193,
    image: "/locations/meenakshi-madurai.jpg",
    credit: "Wikimedia Commons — Meenakshi Temple gopuram detail",
    atmosphere: "Colour-soaked stone towers rise above a busy temple town.",
  },
  {
    id: "shore-mahabalipuram",
    name: "Shore Temple",
    district: "Chengalpattu",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "landmark",
    lat: 12.6165,
    lng: 80.1989,
    image: "/locations/shore-mahabalipuram.jpg",
    credit: "Wikimedia Commons — Shore Temple, Mahabalipuram",
    atmosphere: "Weathered granite meets spray from the Bay of Bengal.",
  },
  {
    id: "brihadeeswarar-thanjavur",
    name: "Brihadeeswarar Temple",
    district: "Thanjavur",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "landmark",
    lat: 10.7828,
    lng: 79.1318,
    image: "/locations/brihadeeswarar-thanjavur.jpg",
    credit: "Wikimedia Commons — Brihadeeswarar Temple",
    atmosphere: "A soaring Chola vimana anchors the delta heartland.",
  },
  {
    id: "ooty-lake",
    name: "Ooty Lake",
    district: "Nilgiris",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "feature",
    lat: 11.4102,
    lng: 76.695,
    image: "/locations/ooty-lake.jpg",
    credit: "Wikimedia Commons — A lake in Ooty",
    atmosphere: "Cool mist, eucalyptus air, and a still hill-station lake.",
  },
  {
    id: "kanyakumari",
    name: "Vivekananda Rock Memorial",
    district: "Kanyakumari",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "landmark",
    lat: 8.0779,
    lng: 77.5514,
    image: "/locations/kanyakumari.jpg",
    credit: "Wikimedia Commons — Rock memorial of Vivekananda",
    atmosphere: "Where three seas meet — a rocky memorial offshore.",
  },
  {
    id: "rameswaram",
    name: "Ramanathaswamy Temple",
    district: "Ramanathapuram",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "landmark",
    lat: 9.2881,
    lng: 79.3174,
    image: "/locations/rameswaram.jpg",
    credit: "Wikimedia Commons — Ramanathaswamy Temple",
    atmosphere: "Long pillared corridors on a sacred island town.",
  },
  {
    id: "coimbatore-marudamalai",
    name: "Marudamalai Temple",
    district: "Coimbatore",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "landmark",
    lat: 11.0446,
    lng: 76.8703,
    image: "/locations/coimbatore.jpg",
    credit: "Wikimedia Commons — Marudamalai Lord Murugan Temple",
    atmosphere: "A hillside shrine overlooking the western plains.",
  },
  // Pin-mode name targets (cities / districts / features)
  {
    id: "chennai-city",
    name: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "city",
    lat: 13.0827,
    lng: 80.2707,
  },
  {
    id: "madurai-city",
    name: "Madurai",
    district: "Madurai",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "city",
    lat: 9.9252,
    lng: 78.1198,
  },
  {
    id: "coimbatore-city",
    name: "Coimbatore",
    district: "Coimbatore",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "city",
    lat: 11.0168,
    lng: 76.9558,
  },
  {
    id: "trichy-city",
    name: "Tiruchirappalli",
    district: "Tiruchirappalli",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "city",
    lat: 10.7905,
    lng: 78.7047,
  },
  {
    id: "salem-city",
    name: "Salem",
    district: "Salem",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "city",
    lat: 11.6643,
    lng: 78.146,
  },
  {
    id: "tirunelveli-city",
    name: "Tirunelveli",
    district: "Tirunelveli",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "city",
    lat: 8.7139,
    lng: 77.7567,
  },
  {
    id: "vellore-city",
    name: "Vellore",
    district: "Vellore",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "city",
    lat: 12.9165,
    lng: 79.1325,
  },
  {
    id: "thanjavur-city",
    name: "Thanjavur",
    district: "Thanjavur",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "city",
    lat: 10.787,
    lng: 79.1378,
  },
  {
    id: "nilgiris-district",
    name: "Nilgiris district",
    district: "Nilgiris",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "district",
    lat: 11.4916,
    lng: 76.7337,
  },
  {
    id: "hogenakkal",
    name: "Hogenakkal Falls",
    district: "Dharmapuri",
    state: "Tamil Nadu",
    regionId: "tamil-nadu",
    kind: "feature",
    lat: 12.1194,
    lng: 77.7737,
  },
];

export const ROUNDS_PER_GAME = 5;

export function placesForMode(mode: "spot" | "pin"): Place[] {
  if (mode === "spot") {
    return TN_PLACES.filter((p) => Boolean(p.image));
  }
  return TN_PLACES;
}

export function shufflePlaces(places: Place[], count: number): Place[] {
  const copy = [...places];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export function getLiveRegion(): Region {
  return REGIONS.find((r) => r.status === "live")!;
}

export function kindLabel(kind: PlaceKind): string {
  switch (kind) {
    case "city":
      return "City";
    case "district":
      return "District";
    case "feature":
      return "Feature";
    default:
      return "Landmark";
  }
}
