export type QuizModeId = "pin" | "type" | "place";

export type QuizStatus = "live" | "coming-soon";

export type QuizDef = {
  id: string;
  title: string;
  region: string;
  blurb: string;
  status: QuizStatus;
  /** Modes this quiz supports; only pin is implemented for live quizzes. */
  modes: QuizModeId[];
  /** GeoJSON path for Pin maps */
  geoPath?: string;
  itemCount?: number;
  /** Plural noun for progress copy (“districts”, “states”). */
  itemNoun?: string;
};

/** Catalog of Seterra-style map quizzes (TN-first). */
export const QUIZZES: QuizDef[] = [
  {
    id: "tn-districts",
    title: "Tamil Nadu: Districts",
    region: "Tamil Nadu",
    blurb: "Click every district on a vector map of Tamil Nadu.",
    status: "live",
    modes: ["pin", "type", "place"],
    geoPath: "/geo/tn-districts.geojson",
    itemNoun: "districts",
  },
  {
    id: "tn-capitals",
    title: "Tamil Nadu: District capitals",
    region: "Tamil Nadu",
    blurb: "Name or place each district headquarters — coming soon.",
    status: "coming-soon",
    modes: ["pin", "type"],
  },
  {
    id: "india-states",
    title: "India: States",
    region: "India",
    blurb: "Click every state and union territory on a vector map of India.",
    status: "live",
    modes: ["pin", "type", "place"],
    geoPath: "/geo/india-states.geojson",
    itemCount: 36,
    itemNoun: "states",
  },
  {
    id: "india-capitals",
    title: "India: Capitals",
    region: "India",
    blurb: "State and UT capitals — placeholder pack.",
    status: "coming-soon",
    modes: ["pin", "type"],
  },
];

export const MAX_WRONG_ATTEMPTS = 3;

export type DistrictResultColor = "green" | "yellow" | "red" | "idle";

/** Points for a finished district (classic Seterra-ish weighting). */
export function pointsForAttempts(wrongBeforeSuccess: number, failed: boolean): number {
  if (failed) return 0;
  if (wrongBeforeSuccess <= 0) return 1;
  if (wrongBeforeSuccess === 1) return 0.5;
  return 0.25; // found on 3rd try
}

export function resultColor(
  wrongBeforeSuccess: number,
  failed: boolean,
): DistrictResultColor {
  if (failed) return "red";
  if (wrongBeforeSuccess <= 0) return "green";
  return "yellow";
}

export function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function shuffleIds(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
