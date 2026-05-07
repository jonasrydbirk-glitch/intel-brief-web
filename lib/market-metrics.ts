/**
 * Curated maritime market metrics — single source of truth for the
 * Market Pulse selector. Drives the onboarding picker, settings UI,
 * and the Architect prompt instructions in engine/brief-generator.ts.
 *
 * Metric IDs are stable strings stored on subscribers.market_pulse_metrics
 * (JSONB array). Renaming an ID is a breaking change — add new IDs instead.
 */

export type MarketMetricCategory =
  | "Dry Bulk"
  | "Tanker"
  | "Container"
  | "Bunker Fuel"
  | "Energy"
  | "LNG / Gas"
  | "Other";

export interface MarketMetric {
  id: string;
  name: string;
  category: MarketMetricCategory;
  unit: string;
  description: string;
  frequency: "daily" | "weekly";
  source: string;
}

export const MARKET_METRICS: MarketMetric[] = [
  // ── Dry Bulk ─────────────────────────────────────────────────────────────
  {
    id: "bdi",
    name: "Baltic Dry Index (BDI)",
    category: "Dry Bulk",
    unit: "points",
    description: "Composite index of dry bulk freight rates across Capesize, Panamax, and Supramax.",
    frequency: "daily",
    source: "Baltic Exchange",
  },
  {
    id: "bci",
    name: "Baltic Capesize Index (BCI)",
    category: "Dry Bulk",
    unit: "points",
    description: "Spot rates for Capesize bulkers — iron ore and coal trades.",
    frequency: "daily",
    source: "Baltic Exchange",
  },
  {
    id: "bsi",
    name: "Baltic Supramax Index (BSI)",
    category: "Dry Bulk",
    unit: "points",
    description: "Spot rates for Supramax bulkers — minor bulks and grain.",
    frequency: "daily",
    source: "Baltic Exchange",
  },

  // ── Tanker ───────────────────────────────────────────────────────────────
  {
    id: "bcti",
    name: "Baltic Clean Tanker Index (BCTI)",
    category: "Tanker",
    unit: "points",
    description: "Spot rates for clean petroleum product tankers.",
    frequency: "daily",
    source: "Baltic Exchange",
  },
  {
    id: "bdti",
    name: "Baltic Dirty Tanker Index (BDTI)",
    category: "Tanker",
    unit: "points",
    description: "Spot rates for crude oil tankers — VLCC, Suezmax, Aframax.",
    frequency: "daily",
    source: "Baltic Exchange",
  },

  // ── Container ────────────────────────────────────────────────────────────
  {
    id: "fbx",
    name: "Freightos Baltic Index (FBX)",
    category: "Container",
    unit: "$/FEU",
    description: "Global container spot rates, weighted across major lanes.",
    frequency: "daily",
    source: "Freightos / Baltic Exchange",
  },
  {
    id: "scfi",
    name: "Shanghai Containerized Freight Index (SCFI)",
    category: "Container",
    unit: "points",
    description: "Spot container rates ex-Shanghai across 15 lanes.",
    frequency: "weekly",
    source: "Shanghai Shipping Exchange",
  },
  {
    id: "harpex",
    name: "Harpex Container Index",
    category: "Container",
    unit: "points",
    description: "Charter rates for container vessels by size.",
    frequency: "weekly",
    source: "Harper Petersen",
  },

  // ── Bunker Fuel ──────────────────────────────────────────────────────────
  {
    id: "vlsfo_sg",
    name: "VLSFO Singapore",
    category: "Bunker Fuel",
    unit: "$/mt",
    description: "Very Low Sulphur Fuel Oil (0.50%) delivered Singapore.",
    frequency: "daily",
    source: "Ship & Bunker",
  },
  {
    id: "vlsfo_rdam",
    name: "VLSFO Rotterdam",
    category: "Bunker Fuel",
    unit: "$/mt",
    description: "Very Low Sulphur Fuel Oil (0.50%) delivered Rotterdam.",
    frequency: "daily",
    source: "Ship & Bunker",
  },
  {
    id: "hsfo_380",
    name: "HSFO 380 Global Average",
    category: "Bunker Fuel",
    unit: "$/mt",
    description: "High Sulphur Fuel Oil (3.50%) global four-port average.",
    frequency: "daily",
    source: "Ship & Bunker",
  },
  {
    id: "mgo",
    name: "MGO (Marine Gas Oil)",
    category: "Bunker Fuel",
    unit: "$/mt",
    description: "Marine Gas Oil distillate, global average.",
    frequency: "daily",
    source: "Ship & Bunker",
  },

  // ── Energy ───────────────────────────────────────────────────────────────
  {
    id: "brent",
    name: "Brent Crude",
    category: "Energy",
    unit: "$/bbl",
    description: "ICE Brent crude oil front-month futures.",
    frequency: "daily",
    source: "ICE / Reuters",
  },
  {
    id: "henry_hub",
    name: "Henry Hub Natural Gas",
    category: "Energy",
    unit: "$/MMBtu",
    description: "NYMEX Henry Hub natural gas front-month futures.",
    frequency: "daily",
    source: "CME / EIA",
  },
  {
    id: "ttf",
    name: "TTF Natural Gas",
    category: "Energy",
    unit: "EUR/MWh",
    description: "Dutch Title Transfer Facility gas front-month — European benchmark.",
    frequency: "daily",
    source: "ICE Endex",
  },

  // ── LNG / Gas ────────────────────────────────────────────────────────────
  {
    id: "lng_jkm",
    name: "LNG Spot Asia (JKM)",
    category: "LNG / Gas",
    unit: "$/MMBtu",
    description: "Japan-Korea Marker — Asian LNG spot benchmark.",
    frequency: "daily",
    source: "Platts / S&P Global",
  },
  {
    id: "lng_atlantic",
    name: "LNG Spot Atlantic",
    category: "LNG / Gas",
    unit: "$/MMBtu",
    description: "Northwest Europe / Atlantic basin LNG spot.",
    frequency: "daily",
    source: "Platts / S&P Global",
  },
  {
    id: "lng_carrier",
    name: "LNG Carrier Spot Rate",
    category: "LNG / Gas",
    unit: "$/day",
    description: "Spot charter rate for 174k-cbm 2-stroke LNG carriers.",
    frequency: "weekly",
    source: "Spark Commodities / Clarksons",
  },

  // ── Other ────────────────────────────────────────────────────────────────
  {
    id: "port_congestion",
    name: "Port Congestion Index",
    category: "Other",
    unit: "% of fleet",
    description: "Share of global container fleet at congested ports.",
    frequency: "weekly",
    source: "Linerlytica / Sea-Intelligence",
  },
];

export const METRIC_CATEGORIES: MarketMetricCategory[] = [
  "Dry Bulk",
  "Tanker",
  "Container",
  "Bunker Fuel",
  "Energy",
  "LNG / Gas",
  "Other",
];

const METRIC_BY_ID = new Map(MARKET_METRICS.map((m) => [m.id, m]));

export function getMetricById(id: string): MarketMetric | undefined {
  return METRIC_BY_ID.get(id);
}

/** Filter and de-dupe a list of metric IDs against the curated list. */
export function sanitiseMetricIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    if (!METRIC_BY_ID.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    result.push(raw);
  }
  return result;
}

/** Group metrics by category, preserving METRIC_CATEGORIES order. */
export function groupByCategory(): Record<MarketMetricCategory, MarketMetric[]> {
  const grouped = Object.fromEntries(
    METRIC_CATEGORIES.map((c) => [c, [] as MarketMetric[]])
  ) as Record<MarketMetricCategory, MarketMetric[]>;
  for (const m of MARKET_METRICS) {
    grouped[m.category].push(m);
  }
  return grouped;
}
