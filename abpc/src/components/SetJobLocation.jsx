/**
 * SetJobLocation — Admin sets GPS coordinates for a job.
 * Uses OpenStreetMap Nominatim — 100% free, no API key.
 *
 * Methods:
 *   1. Live search autocomplete (type → suggestions appear)
 *   2. Use My GPS (go to job site, tap button)
 *   3. Paste lat/lng manually
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Navigation, Loader2, X, CheckCircle2, Search } from "lucide-react";
import { getCurrentLocation } from "../utils/geoLocation";
import { updateRecord } from "../utils/firestoreHelpers";

const glass = {
  background: "rgba(14,14,14,0.98)",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(24px)",
};

/* ── Nominatim search with debounce ───────────────────────── */
async function searchNominatim(query) {
  if (!query?.trim() || query.trim().length < 3) return [];
  // Append India if not already mentioned for better results
  const q = /india|gujarat|maharashtra|rajasthan|delhi|mumbai|ahmedabad/i.test(query)
    ? query.trim()
    : `${query.trim()}, India`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&countrycodes=in`;
  const res = await fetch(url); // no custom headers — avoids CORS preflight
  if (!res.ok) return [];
  const data = await res.json();
  return data.map(r => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    displayName: r.display_name,
    shortName: [
      r.address?.road || r.address?.neighbourhood || r.address?.suburb,
      r.address?.city || r.address?.town || r.address?.village,
      r.address?.state,
    ].filter(Boolean).join(", "),
  }));
}

export default function SetJobLocation({ job, onClose, onSaved }) {
  const jobAddress = job.address || job.customerAddress || "";

  const [query, setQuery] = useState(jobAddress);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [lat, setLat] = useState(job.jobLat ? String(job.jobLat) : "");
  const [lng, setLng] = useState(job.jobLng ? String(job.jobLng) : "");
  const [displayName, setDisplayName] = useState(
    job.jobLat && job.jobLng
      ? `Saved: ${Number(job.jobLat).toFixed(5)}, ${Number(job.jobLng).toFixed(5)}`
      : ""
  );

  const [saving, setSaving] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  const hasCoords = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  // ── Debounced search ─────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchNominatim(query);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch (_) {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ── Close dropdown on outside click ─────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Pick a suggestion ────────────────────────────────────────
  const pickSuggestion = (s) => {
    setLat(String(s.lat));
    setLng(String(s.lng));
    setDisplayName(s.displayName);
    setQuery(s.shortName || s.displayName);
    setShowDropdown(false);
    setSuggestions([]);
    setMsg("Location selected ✅ — verify on map before saving.");
    setErr("");
  };

  // ── Use GPS ──────────────────────────────────────────────────
  const handleUseMyLocation = async () => {
    setFetchingGps(true);
    setErr("");
    setMsg("");
    try {
      const loc = await getCurrentLocation();
      setLat(String(loc.lat));
      setLng(String(loc.lng));
      setDisplayName(`GPS: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)} (±${Math.round(loc.accuracy)}m)`);
      setQuery(`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`);
      setMsg("GPS captured ✅ — only use this if you're physically at the job site.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setFetchingGps(false);
    }
  };

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const pLat = parseFloat(lat), pLng = parseFloat(lng);
    if (isNaN(pLat) || isNaN(pLng)) { setErr("Set a location first."); return; }
    if (pLat < -90 || pLat > 90 || pLng < -180 || pLng > 180) { setErr("Coordinates out of range."); return; }
    setSaving(true);
    try {
      await updateRecord("jobs", job.id, { jobLat: pLat, jobLng: pLng });
      onSaved?.({ lat: pLat, lng: pLng });
      onClose();
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden max-h-[95vh] overflow-y-auto"
        style={{ ...glass, boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ background: "rgba(14,14,14,0.98)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(76,122,45,0.2)" }}>
              <MapPin className="w-4 h-4" style={{ color: "#6DBF4A" }} />
            </div>
            <div>
              <p className="font-black text-white text-sm">Set Job Location</p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                {job.customerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl"
            style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Job address on file */}
          {jobAddress && (
            <div className="rounded-xl px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}>Job Address</p>
              <p className="text-sm text-white">{jobAddress}</p>
            </div>
          )}

          {/* ── METHOD 1: Live search autocomplete ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-2"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              🔍 Search Address (Free · No API Key)
            </p>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setErr(""); setMsg(""); }}
                  placeholder="Type area, street, landmark…"
                  className="w-full px-3 py-3 rounded-xl text-sm text-white pr-10"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                  autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {searching
                    ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
                    : <Search className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                  }
                </div>
              </div>

              {/* Dropdown suggestions */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                  style={{ background: "rgba(20,20,20,0.99)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 16px 40px rgba(0,0,0,0.8)" }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickSuggestion(s)}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{ borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(76,122,45,0.15)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#6DBF4A" }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {s.shortName || s.displayName.split(",")[0]}
                          </p>
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {s.displayName}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                            {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
              Type 3+ characters — suggestions appear automatically. Include city for best results.
            </p>
          </div>

          {/* ── METHOD 2: Use GPS ── */}
          <button onClick={handleUseMyLocation} disabled={fetchingGps}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{ background: "rgba(76,122,45,0.12)", border: "1px solid rgba(76,122,45,0.25)", color: "#6DBF4A" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 16px rgba(76,122,45,0.3)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            {fetchingGps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            {fetchingGps ? "Getting GPS…" : "📍 Use My GPS (go to job site first)"}
          </button>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.2)" }}>OR PASTE MANUALLY</p>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* ── METHOD 3: Manual lat/lng ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5"
                style={{ color: "rgba(255,255,255,0.3)" }}>Latitude</label>
              <input type="number" step="any" value={lat}
                onChange={e => { setLat(e.target.value); setMsg(""); setErr(""); setDisplayName(""); }}
                placeholder="23.0225"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5"
                style={{ color: "rgba(255,255,255,0.3)" }}>Longitude</label>
              <input type="number" step="any" value={lng}
                onChange={e => { setLng(e.target.value); setMsg(""); setErr(""); setDisplayName(""); }}
                placeholder="72.5714"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>
            💡 Google Maps → long-press job location → tap coordinates at bottom to copy
          </p>

          {/* ── Selected location display ── */}
          {hasCoords && displayName && (
            <div className="rounded-xl p-3"
              style={{ background: "rgba(76,122,45,0.1)", border: "1px solid rgba(76,122,45,0.25)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "#6DBF4A" }}>
                Selected Location
              </p>
              <p className="text-xs text-white leading-relaxed line-clamp-2">{displayName}</p>
              <p className="text-[10px] mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
              </p>
            </div>
          )}

          {/* ── Verify on map ── */}
          {hasCoords && (
            <a href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.2)", color: "#60A5FA" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(66,133,244,0.25)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <MapPin className="w-3.5 h-3.5" /> Verify on Google Maps ↗
            </a>
          )}

          {/* ── Messages ── */}
          {msg && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(76,122,45,0.12)", border: "1px solid rgba(76,122,45,0.25)" }}>
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#6DBF4A" }} />
              <p className="text-xs leading-relaxed" style={{ color: "#6DBF4A" }}>{msg}</p>
            </div>
          )}
          {err && (
            <div className="px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(228,87,46,0.1)", border: "1px solid rgba(228,87,46,0.25)" }}>
              <p className="text-xs leading-relaxed" style={{ color: "#F87171" }}>{err}</p>
            </div>
          )}

          {/* ── Save button ── */}
          <button onClick={handleSave} disabled={!hasCoords || saving}
            className="w-full py-4 rounded-xl font-black text-sm transition-all"
            style={{
              background: hasCoords && !saving ? "linear-gradient(135deg,#1F3D1F,#4C7A2D)" : "rgba(255,255,255,0.05)",
              border: hasCoords ? "1px solid rgba(76,122,45,0.45)" : "1px solid rgba(255,255,255,0.07)",
              color: hasCoords ? "#fff" : "rgba(255,255,255,0.2)",
              boxShadow: hasCoords && !saving ? "0 0 20px rgba(76,122,45,0.3)" : "none",
            }}
            onMouseEnter={e => { if (hasCoords && !saving) e.currentTarget.style.boxShadow = "0 0 32px rgba(76,122,45,0.5)"; }}
            onMouseLeave={e => { if (hasCoords && !saving) e.currentTarget.style.boxShadow = "0 0 20px rgba(76,122,45,0.3)"; }}>
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {hasCoords ? "Save Job Location" : "Select a location first"}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
