/**
 * Geo-Location utilities
 * - Photon (komoot) — primary geocoder, faster & better for Indian addresses
 * - Nominatim (OSM) — fallback geocoder
 * - Google Maps URL parser — extract lat/lng from any Google Maps link
 * - Browser GPS — no cached results
 * All completely free, no API key required.
 */

/** Get employee's live GPS location — no cached results */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        const messages = {
          1: "Location permission denied. Please enable GPS to check in.",
          2: "Location unavailable. Please try again.",
          3: "Location request timed out. Please try again.",
        };
        reject(new Error(messages[err.code] || "Failed to get location."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/**
 * Parse a Google Maps URL and extract lat/lng.
 * Supports all common Google Maps URL formats.
 * Returns { lat, lng } or null if not a valid Maps link.
 */
export function parseGoogleMapsUrl(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();

  // Format: https://www.google.com/maps/place/.../@23.12345,72.54321,15z
  const atMatch = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Format: https://maps.google.com/?q=23.12345,72.54321
  // Format: https://www.google.com/maps?q=23.12345,72.54321
  const qMatch = s.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Format: plain "lat,lng" coordinate string  e.g. "23.0225, 72.5714"
  const plainCoord = s.match(/^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (plainCoord) {
    const lat = parseFloat(plainCoord[1]);
    const lng = parseFloat(plainCoord[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

function isValidLatLng(lat, lng) {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Search addresses using Photon (komoot) — fast, free, no API key.
 * Biased towards India for better local results.
 * Returns array of { lat, lng, displayName, shortName }
 */
export async function searchPhoton(query, limit = 6) {
  if (!query?.trim() || query.trim().length < 3) return [];
  // Bias search towards India (center of India approx)
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=${limit}&lang=en&lat=20.5937&lon=78.9629&zoom=6`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || []).map((f) => {
    const p = f.properties || {};
    const coords = f.geometry?.coordinates || [];
    const lng = coords[0];
    const lat = coords[1];
    if (!lat || !lng) return null;
    const parts = [p.name, p.street, p.city || p.county, p.state].filter(Boolean);
    const shortName = parts.slice(0, 3).join(", ");
    const displayName = [p.name, p.street, p.city || p.county, p.state, p.country]
      .filter(Boolean).join(", ");
    return { lat, lng, displayName, shortName };
  }).filter(Boolean);
}

/**
 * Nominatim (OSM) search — fallback with smart address splitting.
 * Returns array of { lat, lng, displayName, shortName }
 */
export async function searchNominatim(query, limit = 6) {
  if (!query?.trim() || query.trim().length < 3) return [];
  const withIndia = /india|gujarat|maharashtra|rajasthan|delhi|mumbai|ahmedabad|surat|vadodara|rajkot|gandhinagar/i.test(query)
    ? query.trim() : `${query.trim()}, India`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(withIndia)}&format=json&limit=${limit}&addressdetails=1&countrycodes=in`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((r) => {
    const a = r.address || {};
    const shortName = [a.road || a.neighbourhood || a.suburb, a.city || a.town || a.village, a.state]
      .filter(Boolean).join(", ");
    return {
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
      shortName,
    };
  });
}

/**
 * Geocode address → { lat, lng, displayName }
 * Tries Photon first, falls back to Nominatim.
 */
export async function geocodeAddress(address) {
  if (!address || address.trim().length < 5) throw new Error("Address too short to geocode.");

  // Try Photon first
  try {
    const results = await searchPhoton(address, 1);
    if (results.length > 0) return results[0];
  } catch { /* fall through */ }

  // Fallback to Nominatim with progressive trimming
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  const queries = [address];
  if (parts.length >= 3) {
    queries.push(parts.slice(1).join(", "));
    if (parts.length >= 4) queries.push(parts.slice(2).join(", "));
  }

  for (const q of queries) {
    try {
      const results = await searchNominatim(q, 1);
      if (results.length > 0) return results[0];
    } catch { continue; }
  }

  throw new Error(`Could not find location for: "${address}". Try a landmark or area name.`);
}

/**
 * Haversine formula — distance between two lat/lng points in kilometers.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) { return deg * (Math.PI / 180); }

/** Format distance for display */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Reverse geocode lat/lng → address string */
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
