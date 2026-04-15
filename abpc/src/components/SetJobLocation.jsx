/**
 * SetJobLocation — Admin sets GPS coordinates for a job.
 * 100% FREE — No API Key required.
 *
 * AUTO MODE: On open, automatically geocodes the customer address.
 * If it works → user just verifies + saves. Done in 2 clicks.
 * Manual fallback tabs available if auto fails.
 */
import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Loader2, X, CheckCircle2, Search, Link, AlertCircle, Zap, RefreshCw } from "lucide-react";
import { getCurrentLocation, parseGoogleMapsUrl, searchPhoton, searchNominatim } from "../utils/geoLocation";
import { updateRecord } from "../utils/firestoreHelpers";

const glass = {
  background: "rgba(14,14,14,0.98)",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(24px)",
};

/** Search: Photon first, then Nominatim fallback */
async function searchLocations(query, limit = 6) {
  if (!query?.trim() || query.trim().length < 3) return [];
  try {
    const r = await searchPhoton(query, limit);
    if (r.length > 0) return r;
  } catch { /* fall through */ }
  try {
    return await searchNominatim(query, limit);
  } catch { return []; }
}

/** Auto-geocode: try multiple progressive variants of the address */
async function autoGeocode(address) {
  if (!address?.trim()) return null;

  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);

  // Build query variants from most-specific to least-specific
  // Nominatim/Photon struggle with flat/house numbers, so we skip the first part
  const variants = [];
  if (parts.length >= 1) variants.push(address); // full address
  if (parts.length >= 3) variants.push(parts.slice(1).join(", ")); // skip flat no.
  if (parts.length >= 4) variants.push(parts.slice(2).join(", ")); // area + city
  if (parts.length >= 4) variants.push(parts.slice(-2).join(", ")); // city + pin/state

  for (const q of variants) {
    try {
      const r = await searchLocations(q, 1);
      if (r.length > 0) return { ...r[0], matchedQuery: q };
    } catch { continue; }
  }
  return null;
}

export default function SetJobLocation({ job, onClose, onSaved }) {
  const jobAddress = job.address || job.customerAddress || "";

  // ── Auto state ─────────────────────────────────────────────────
  const [autoStatus, setAutoStatus] = useState("idle"); // idle | loading | success | failed
  const [autoResult, setAutoResult] = useState(null);

  // ── Coordinates ────────────────────────────────────────────────
  const [lat, setLat] = useState(job.jobLat ? String(job.jobLat) : "");
  const [lng, setLng] = useState(job.jobLat ? String(job.jobLng) : "");
  const [displayName, setDisplayName] = useState(
    job.jobLat && job.jobLng
      ? `Previously saved: ${Number(job.jobLat).toFixed(5)}, ${Number(job.jobLng).toFixed(5)}`
      : ""
  );
  const hasCoords = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  // ── Manual fallback state ──────────────────────────────────────
  const [showManual, setShowManual] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [query, setQuery] = useState(jobAddress);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mapsLink, setMapsLink] = useState("");
  const [mapsLinkErr, setMapsLinkErr] = useState("");

  // ── UI state ───────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // ══════════════════════════════════════════════════════════════
  // AUTO GEOCODE on mount
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    // If coordinates already saved, skip auto — just show them
    if (job.jobLat && job.jobLng) return;
    if (!jobAddress) return;

    runAutoGeocode();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runAutoGeocode = async () => {
    setAutoStatus("loading");
    setErr("");
    setMsg("");
    try {
      const result = await autoGeocode(jobAddress);
      if (result) {
        setAutoResult(result);
        setLat(String(result.lat));
        setLng(String(result.lng));
        setDisplayName(result.displayName);
        setAutoStatus("success");
        setMsg("");
      } else {
        setAutoStatus("failed");
      }
    } catch {
      setAutoStatus("failed");
    }
  };

  // ── Debounced manual search ─────────────────────────────────────
  useEffect(() => {
    if (!showManual) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchLocations(query);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch { setSuggestions([]); } finally { setSearching(false); }
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [query, showManual]);

  // ── Close dropdown on outside click ───────────────────────────
  useEffect(() => {
    const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────
  const applyCoords = (pLat, pLng, name) => {
    setLat(String(pLat));
    setLng(String(pLng));
    setDisplayName(name || `${pLat.toFixed(5)}, ${pLng.toFixed(5)}`);
    setErr(""); setMsg("");
    setAutoStatus("success"); // treat as confirmed
  };

  const pickSuggestion = (s) => {
    applyCoords(s.lat, s.lng, s.displayName);
    setQuery(s.shortName || s.displayName.split(",")[0]);
    setShowDropdown(false);
    setSuggestions([]);
    setMsg("Location selected ✅ — verify on map then save.");
  };

  const handleParseMapsLink = () => {
    setMapsLinkErr("");
    const parsed = parseGoogleMapsUrl(mapsLink);
    if (!parsed) { setMapsLinkErr("Could not extract coordinates. Paste a full Google Maps link (not goo.gl)."); return; }
    applyCoords(parsed.lat, parsed.lng, "From Google Maps link");
    setMsg(`✅ Extracted: ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`);
    setMapsLink("");
  };

  const handleMapsLinkChange = (e) => {
    const val = e.target.value;
    setMapsLink(val);
    setMapsLinkErr("");
    if (val.includes("google.com/maps") || val.includes("maps.google.com")) {
      const parsed = parseGoogleMapsUrl(val);
      if (parsed) { applyCoords(parsed.lat, parsed.lng, "From Google Maps link"); setMsg(`✅ Extracted: ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`); setMapsLink(""); }
    }
  };

  const handleUseGps = async () => {
    setFetchingGps(true); setErr(""); setMsg("");
    try {
      const loc = await getCurrentLocation();
      applyCoords(loc.lat, loc.lng, `GPS: ±${Math.round(loc.accuracy)}m accuracy`);
      setMsg("GPS captured ✅ — only use this if you're physically at the job site.");
    } catch (e) { setErr(e.message); } finally { setFetchingGps(false); }
  };

  const handleSave = async () => {
    const pLat = parseFloat(lat), pLng = parseFloat(lng);
    if (isNaN(pLat) || isNaN(pLng)) { setErr("Set a location first."); return; }
    if (pLat < -90 || pLat > 90 || pLng < -180 || pLng > 180) { setErr("Coordinates out of range."); return; }
    setSaving(true);
    try {
      await updateRecord("jobs", job.id, { jobLat: pLat, jobLng: pLng });
      onSaved?.({ lat: pLat, lng: pLng });
      onClose();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  const tabStyle = (id) => ({
    flex: 1, padding: "8px 4px", fontSize: "11px", fontWeight: 700,
    borderRadius: "8px", border: "none", cursor: "pointer", transition: "all 0.2s",
    background: activeTab === id ? "rgba(76,122,45,0.25)" : "transparent",
    color: activeTab === id ? "#6DBF4A" : "rgba(255,255,255,0.35)",
    outline: activeTab === id ? "1px solid rgba(76,122,45,0.4)" : "none",
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden max-h-[95vh] overflow-y-auto"
        style={{ ...glass, boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ background: "rgba(14,14,14,0.98)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(76,122,45,0.2)" }}>
              <MapPin className="w-4 h-4" style={{ color: "#6DBF4A" }} />
            </div>
            <div>
              <p className="font-black text-white text-sm">Set Job Location</p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{job.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl"
            style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Customer address */}
          {jobAddress && (
            <div className="rounded-xl px-3 py-2.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                Customer Address
              </p>
              <p className="text-sm text-white">{jobAddress}</p>
            </div>
          )}

          {/* ══════════ AUTO GEOCODE RESULT ══════════ */}

          {/* Loading */}
          {autoStatus === "loading" && (
            <div className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: "rgba(76,122,45,0.08)", border: "1px solid rgba(76,122,45,0.2)" }}>
              <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: "#6DBF4A" }} />
              <div>
                <p className="text-sm font-black" style={{ color: "#6DBF4A" }}>Auto-locating address…</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Searching Photon + OpenStreetMap
                </p>
              </div>
            </div>
          )}

          {/* Success */}
          {autoStatus === "success" && hasCoords && (
            <div className="rounded-xl p-3.5 space-y-2.5"
              style={{ background: "rgba(76,122,45,0.12)", border: "1px solid rgba(76,122,45,0.35)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: "#6DBF4A" }} />
                  <p className="text-xs font-black" style={{ color: "#6DBF4A" }}>Auto-located ✅</p>
                </div>
                <button
                  onClick={runAutoGeocode}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
              <p className="text-xs text-white leading-relaxed">{displayName}</p>
              <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold"
                style={{ background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.25)", color: "#60A5FA" }}
              >
                <MapPin className="w-3.5 h-3.5" /> Verify on Google Maps ↗
              </a>
            </div>
          )}

          {/* Failed */}
          {autoStatus === "failed" && (
            <div className="rounded-xl p-3.5 space-y-2"
              style={{ background: "rgba(228,87,46,0.08)", border: "1px solid rgba(228,87,46,0.25)" }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#F87171" }} />
                <p className="text-xs font-black" style={{ color: "#F87171" }}>
                  Couldn't auto-locate this address
                </p>
              </div>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                The address may be too specific or use a local name. Use the manual options below.
              </p>
              <button
                onClick={runAutoGeocode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
              >
                <RefreshCw className="w-3 h-3" /> Try Again
              </button>
            </div>
          )}

          {/* Already had coords */}
          {autoStatus === "idle" && job.jobLat && job.jobLng && hasCoords && (
            <div className="rounded-xl p-3.5 space-y-2"
              style={{ background: "rgba(76,122,45,0.1)", border: "1px solid rgba(76,122,45,0.3)" }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: "#6DBF4A" }} />
                <p className="text-xs font-black" style={{ color: "#6DBF4A" }}>Location already saved</p>
              </div>
              <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold"
                style={{ background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.25)", color: "#60A5FA" }}
              >
                <MapPin className="w-3.5 h-3.5" /> View on Google Maps ↗
              </a>
            </div>
          )}

          {/* ══════════ MANUAL FALLBACK SECTION ══════════ */}

          <button
            onClick={() => setShowManual((p) => !p)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
          >
            <span>🛠 Set location manually</span>
            <span style={{ fontSize: "10px" }}>{showManual ? "▲ Hide" : "▼ Show"}</span>
          </button>

          {showManual && (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                <button style={tabStyle("search")} onClick={() => setActiveTab("search")}>🔍 Search</button>
                <button style={tabStyle("maps")} onClick={() => setActiveTab("maps")}>📍 Maps Link</button>
                <button style={tabStyle("manual")} onClick={() => setActiveTab("manual")}>✏️ Manual</button>
              </div>

              {/* Search tab */}
              {activeTab === "search" && (
                <div className="space-y-3">
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <input
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setErr(""); setMsg(""); }}
                        placeholder="Area, street, landmark, city…"
                        className="w-full px-3 py-3 rounded-xl text-sm text-white pr-10"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                        autoComplete="off"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {searching
                          ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
                          : <Search className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />}
                      </div>
                    </div>
                    {showDropdown && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                        style={{ background: "rgba(20,20,20,0.99)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 16px 40px rgba(0,0,0,0.8)" }}>
                        {suggestions.map((s, i) => (
                          <button key={i} type="button" onClick={() => pickSuggestion(s)}
                            className="w-full text-left px-4 py-3 transition-colors"
                            style={{ borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(76,122,45,0.15)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#6DBF4A" }} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{s.shortName || s.displayName.split(",")[0]}</p>
                                <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{s.displayName}</p>
                                <p className="text-[10px] mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>{s.lat.toFixed(5)}, {s.lng.toFixed(5)}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Powered by Photon + OpenStreetMap · Free · No API key
                  </p>
                </div>
              )}

              {/* Maps link tab */}
              {activeTab === "maps" && (
                <div className="space-y-3">
                  <div className="rounded-xl p-3 space-y-1" style={{ background: "rgba(66,133,244,0.08)", border: "1px solid rgba(66,133,244,0.2)" }}>
                    <p className="text-xs font-black text-blue-400">How to get the link:</p>
                    <ol className="text-[11px] space-y-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                      <li>1. Open <span className="text-blue-400 font-bold">Google Maps</span></li>
                      <li>2. Search or pin the job location</li>
                      <li>3. Copy the URL from your browser / tap Share</li>
                      <li>4. Paste below — coordinates extract automatically ↓</li>
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={mapsLink}
                      onChange={handleMapsLinkChange}
                      placeholder="https://www.google.com/maps/place/…"
                      className="flex-1 px-3 py-2.5 rounded-xl text-xs text-white"
                      style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${mapsLinkErr ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.12)"}` }}
                      autoComplete="off"
                    />
                    <button onClick={handleParseMapsLink} disabled={!mapsLink.trim()}
                      className="px-3 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 flex-shrink-0"
                      style={{
                        background: mapsLink.trim() ? "rgba(76,122,45,0.2)" : "rgba(255,255,255,0.05)",
                        border: mapsLink.trim() ? "1px solid rgba(76,122,45,0.4)" : "1px solid rgba(255,255,255,0.07)",
                        color: mapsLink.trim() ? "#6DBF4A" : "rgba(255,255,255,0.2)",
                      }}>
                      <Link className="w-3.5 h-3.5" /> Extract
                    </button>
                  </div>
                  {mapsLinkErr && (
                    <div className="flex items-start gap-1.5 px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#F87171" }} />
                      <p className="text-[11px]" style={{ color: "#F87171" }}>{mapsLinkErr}</p>
                    </div>
                  )}
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Also works with raw coords: <span className="font-mono text-white/40">23.0225, 72.5714</span>
                  </p>
                </div>
              )}

              {/* Manual tab */}
              {activeTab === "manual" && (
                <div className="space-y-3">
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                      💡 In Google Maps: <strong className="text-white">long-press</strong> the location → tap the coordinates at the bottom to copy.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Latitude</label>
                      <input type="number" step="any" value={lat}
                        onChange={(e) => { setLat(e.target.value); setMsg(""); setErr(""); setDisplayName("Manual entry"); setAutoStatus("success"); }}
                        placeholder="23.0225"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Longitude</label>
                      <input type="number" step="any" value={lng}
                        onChange={(e) => { setLng(e.target.value); setMsg(""); setErr(""); setDisplayName("Manual entry"); setAutoStatus("success"); }}
                        placeholder="72.5714"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* GPS */}
              <button onClick={handleUseGps} disabled={fetchingGps}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{ background: "rgba(76,122,45,0.12)", border: "1px solid rgba(76,122,45,0.25)", color: "#6DBF4A" }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 0 16px rgba(76,122,45,0.3)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}>
                {fetchingGps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                {fetchingGps ? "Getting GPS…" : "📍 Use My GPS (be at job site)"}
              </button>
            </div>
          )}

          {/* Messages */}
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

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasCoords || saving}
            className="w-full py-4 rounded-xl font-black text-sm transition-all"
            style={{
              background: hasCoords && !saving ? "linear-gradient(135deg,#1F3D1F,#4C7A2D)" : "rgba(255,255,255,0.05)",
              border: hasCoords ? "1px solid rgba(76,122,45,0.45)" : "1px solid rgba(255,255,255,0.07)",
              color: hasCoords ? "#fff" : "rgba(255,255,255,0.2)",
              boxShadow: hasCoords && !saving ? "0 0 20px rgba(76,122,45,0.3)" : "none",
            }}
            onMouseEnter={(e) => { if (hasCoords && !saving) e.currentTarget.style.boxShadow = "0 0 32px rgba(76,122,45,0.5)"; }}
            onMouseLeave={(e) => { if (hasCoords && !saving) e.currentTarget.style.boxShadow = "0 0 20px rgba(76,122,45,0.3)"; }}
          >
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
