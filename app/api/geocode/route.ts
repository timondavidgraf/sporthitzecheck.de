import { type NextRequest } from "next/server";

const MAX_QUERY_LENGTH = 120;
const GOOGLE_TIMEOUT_MS = 8_000;
const RATE_LIMIT_MAX = 40;
const RATE_LIMIT_WINDOW_MS = 60_000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

interface GoogleMapsResponse {
  status: string;
  results?: unknown[];
}

/**
 * Proxy zur Google Maps API (Places Text Search, Fallback Geocoding).
 * Der Browser darf die JSON-Endpunkte von Google nicht direkt aufrufen (CORS).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const key =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!key) {
    return Response.json({ status: "REQUEST_DENIED", results: [] });
  }

  if (q.length === 0 || q.length > MAX_QUERY_LENGTH) {
    return Response.json({ status: "INVALID_REQUEST", results: [] });
  }

  if (isRateLimited(clientKey(request))) {
    return Response.json({ status: "RATE_LIMITED", results: [] });
  }

  try {
    const placesData = await googleGet(
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
        `?query=${encodeURIComponent(q)}&language=de&region=de&key=${key}`
    );

    if (isHardFailure(placesData.status)) {
      return Response.json({ status: placesData.status, results: [] });
    }

    if (placesData.status === "OK" && placesData.results?.length) {
      return Response.json({ status: "OK", results: placesData.results });
    }

    const geoData = await googleGet(
      `https://maps.googleapis.com/maps/api/geocode/json` +
        `?address=${encodeURIComponent(q)}&language=de&region=de&key=${key}`
    );

    if (isHardFailure(geoData.status)) {
      return Response.json({ status: geoData.status, results: [] });
    }

    if (geoData.status === "OK" && geoData.results?.length) {
      return Response.json({ status: "OK", results: geoData.results });
    }

    return Response.json({ status: "ZERO_RESULTS", results: [] });
  } catch {
    return Response.json({ status: "UNKNOWN_ERROR", results: [] });
  }
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

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "local";
}

function isRateLimited(id: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(id);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}
