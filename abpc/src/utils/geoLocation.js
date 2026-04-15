/**
 * Geo-Location utilities
 * Uses OpenStreetMap Nominatim (free, no API key)
 * Uses browser GPS (no manual lat/lng needed)
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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // maximumAge: 0 = no cache
    );
  });
}

/**
 * Geocode a text address → { lat, lng } using OpenStreetMap Nominatim.
 * Searches in India by default for better accuracy.
 * Smart fallback: tries progressively shorter queries if full address fails.
 */
export async function geocodeAddress(address) {
  if (!address || address.trim().length < 5) throw new Error("Address too short to geocode.");

  // Build a list of queries to try, from most specific to least
  // Nominatim can't find flat numbers — skip them, use society/area/city
  const parts = address.split(",").map(s => s.trim()).filter(Boolean);

  // Strategy: skip the first part (flat/house no) if there are 3+ parts
  // because flat numbers confuse Nominatim
  const queries = [];

  if (parts.length >= 3) {
    // Try without flat number first (society + area + city + pin)
    queries.push(parts.slice(1).join(", "));
    // Then try area + city only
    if (parts.length >= 4) queries.push(parts.slice(2).join(", "));
    // Then try just city
    if (parts.length >= 4) queries.push(parts[parts.length - 2] + ", " + parts[parts.length - 1]);
  }
  // Always try the full address too
  queries.unshift(address);

  for (const q of queries) {
    const withIndia = /india|gujarat|maharashtra|rajasthan|delhi|mumbai|ahmedabad|surat|vadodara|rajkot/i.test(q)
      ? q : `${q}, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(withIndia)}&format=json&limit=1&countrycodes=in`;
    try {
      const res = await fetch(url, { headers: { "Accept-Language": "en", "User-Agent": "ABPC-CRM/1.0" } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
    } catch { continue; }
  }

  throw new Error(`Could not find location for: "${address}". Try adding the city name or a nearby landmark.`);
}

/**
 * Haversine formula — calculate distance between two lat/lng points.
 * Returns distance in kilometers.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
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
