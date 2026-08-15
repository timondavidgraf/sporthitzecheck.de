import { type NextRequest } from "next/server";

const MAX_QUERY_LENGTH = 120;
const MAX_RESULTS = 5;
const GOOGLE_TIMEOUT_MS = 8_000;
const RATE_LIMIT_MAX = 40;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_BUCKET_CAP = 2_000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

interface SlimPlace {
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
}

interface GoogleMapsResponse {
  status: string;
  results?: unknown[];
}

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Proxy zur Google Maps API (Places Text Search, Fallback Geocoding).
 * Der Browser darf die JSON-Endpunkte von Google nicht direkt aufrufen (CORS).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const key =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!isSameOrigin(request)) {
    return json("REQUEST_DENIED");
  }

  if (!key) {
    return json("REQUEST_DENIED");
  }

  if (q.length === 0 || q.length > MAX_QUERY_LENGTH) {
    return json("INVALID_REQUEST");
  }

  if (isRateLimited(clientKey(request))) {
    return json("RATE_LIMITED");
  }

  try {
    const placesData = await googleGet(
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
        `?query=${encodeURIComponent(q)}&language=de&region=de&key=${key}`
    );

    if (isHardFailure(placesData.status)) {
      return json(placesData.status);
    }

    if (placesData.status === "OK" && placesData.results?.length) {
      return json("OK", slimResults(placesData.results));
    }

    const geoData = await googleGet(
      `https://maps.googleapis.com/maps/api/geocode/json` +
        `?address=${encodeURIComponent(q)}&language=de&region=de&key=${key}`
    );

    if (isHardFailure(geoData.status)) {
      return json(geoData.status);
    }

    if (geoData.status === "OK" && geoData.results?.length) {
      return json("OK", slimResults(geoData.results));
    }

    return json("ZERO_RESULTS");
  } catch {
    return json("UNKNOWN_ERROR");
  }
}

function json(status: string, results: SlimPlace[] = []) {
  return Response.json({ status, results }, { headers: NO_STORE });
}

function isHardFailure(status: string): boolean {
  return (
    status === "OVER_QUERY_LIMIT" ||
    status === "REQUEST_DENIED" ||
    status === "UNKNOWN_ERROR"
  );
}

async function googleGet(url: string): Promise<GoogleMapsResponse> {
  const res = await fetch(url, { signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) });

  if (res.status === 429) return { status: "OVER_QUERY_LIMIT", results: [] };
  if (res.status === 403) return { status: "REQUEST_DENIED", results: [] };
  if (!res.ok) return { status: "UNKNOWN_ERROR", results: [] };

  const data = (await res.json()) as GoogleMapsResponse;
  const status = typeof data?.status === "string" ? data.status : "UNKNOWN_ERROR";
  return { status, results: Array.isArray(data.results) ? data.results : [] };
}

function isSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) return hostsMatch(origin, host);

  const referer = request.headers.get("referer");
  if (referer) return hostsMatch(referer, host);

  return process.env.NODE_ENV !== "production";
}

function hostsMatch(urlLike: string, host: string): boolean {
  try {
    return new URL(urlLike).host === host;
  } catch {
    return false;
  }
}

function slimResults(results: unknown[]): SlimPlace[] {
  const out: SlimPlace[] = [];

  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const location = readLocation(row.geometry);
    out.push({
      name: typeof row.name === "string" ? row.name : undefined,
      formatted_address:
        typeof row.formatted_address === "string" ? row.formatted_address : undefined,
      geometry: location ? { location } : undefined,
    });
    if (out.length >= MAX_RESULTS) break;
  }

  return out;
}

function readLocation(
  geometry: unknown
): { lat: number; lng: number } | undefined {
  if (!geometry || typeof geometry !== "object") return undefined;
  const loc = (geometry as { location?: { lat?: unknown; lng?: unknown } }).location;
  if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") return undefined;
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return undefined;
  return { lat: loc.lat, lng: loc.lng };
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "local";
}

function isRateLimited(id: string): boolean {
  const now = Date.now();
  pruneRateBuckets(now);
  const bucket = rateBuckets.get(id);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

function pruneRateBuckets(now: number) {
  if (rateBuckets.size < RATE_BUCKET_CAP) return;
  for (const [key, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) rateBuckets.delete(key);
  }
}
