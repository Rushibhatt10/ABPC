/**
 * AttendanceCheckIn — Employee geo-location based check-in.
 * 1. Geocodes job address → lat/lng (OpenStreetMap, free)
 * 2. Gets employee's live GPS
 * 3. Calculates distance (Haversine)
 * 4. Allows check-in only if ≤ 1 KM
 * 5. Saves attendance record to Firestore
 */
import { useEffect, useState, useCallback } from "react";
import { MapPin, Navigation, CheckCircle2, X, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { getCurrentLocation, geocodeAddress, haversineDistance, formatDistance } from "../utils/geoLocation";
import { createRecord, subscribeQuery } from "../utils/firestoreHelpers";
import { collection, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { firebaseAuth } from "../firebase/auth";
import { signInAnonymously } from "firebase/auth";

const MAX_DISTANCE_KM = 1.0;

const glass = {
  background: "rgba(14,14,14,0.98)",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(24px)",
};

export default function AttendanceCheckIn({ job, onClose, onCheckedIn }) {
  const { profile } = useAuth();
  const employeeName = profile?.workerName || profile?.name || "";

  const [phase, setPhase] = useState("idle"); // idle | geocoding | locating | checking | done | error
  const [jobCoords, setJobCoords] = useState(null);
  const [empCoords, setEmpCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [withinRange, setWithinRange] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [checkInRecord, setCheckInRecord] = useState(null);

  const jobAddress = job.address || job.customerAddress || "";

  // Check if already checked in
  useEffect(() => {
    if (!job.id || !employeeName) return;
    const q = query(
      collection(firestoreDb, "attendance"),
      where("jobId", "==", job.id),
      where("employeeName", "==", employeeName)
    );
    return subscribeQuery(q, (records) => {
      if (records.length > 0) {
        setAlreadyCheckedIn(true);
        setCheckInRecord(records[0]);
      }
    });
  }, [job.id, employeeName]);

  const runLocationCheck = useCallback(async () => {
    setErrMsg("");
    setPhase("geocoding");

    try {
      // Step 1: Geocode job address
      let coords;
      if (job.jobLat && job.jobLng) {
        coords = { lat: job.jobLat, lng: job.jobLng };
      } else {
        if (!jobAddress) throw new Error("No address found for this job. Admin must set the job address.");
        coords = await geocodeAddress(jobAddress);
      }
      setJobCoords(coords);

      // Step 2: Get employee live GPS
      setPhase("locating");
      const empPos = await getCurrentLocation();
      setEmpCoords(empPos);

      // Step 3: Calculate distance
      setPhase("checking");
      const dist = haversineDistance(empPos.lat, empPos.lng, coords.lat, coords.lng);
      setDistance(dist);
      setWithinRange(dist <= MAX_DISTANCE_KM);
      setPhase("done");
    } catch (e) {
      setErrMsg(e.message);
      setPhase("error");
    }
  }, [job, jobAddress]);

  useEffect(() => { runLocationCheck(); }, []);

  const handleCheckIn = async () => {
    if (!withinRange || !empCoords) return;
    setPhase("checking");
    try {
      if (!firebaseAuth.currentUser) await signInAnonymously(firebaseAuth);

      await createRecord("attendance", {
        jobId: job.id,
        jobCustomer: job.customerName || "",
        jobService: job.treatmentLabel || job.serviceType || "",
        jobAddress,
        employeeName,
        employeeId: profile?.key || "",
        empLat: empCoords.lat,
        empLng: empCoords.lng,
        empAccuracy: empCoords.accuracy || 0,
        jobLat: jobCoords?.lat || 0,
        jobLng: jobCoords?.lng || 0,
        distanceKm: distance,
        timestamp: new Date().toISOString(),
        status: "Present",
      });

      setAlreadyCheckedIn(true);
      onCheckedIn?.();
    } catch (e) {
      setErrMsg(e.message);
      setPhase("error");
    }
  };

  const phaseLabel = {
    idle: "Initializing…",
    geocoding: "Finding job location…",
    locating: "Getting your GPS…",
    checking: "Calculating distance…",
    done: "",
    error: "Error",
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl"
        style={{ ...glass, boxShadow: "0 24px 80px rgba(0,0,0,0.9)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(76,122,45,0.2)" }}>
              <MapPin className="w-4 h-4" style={{ color: "#6DBF4A" }} />
            </div>
            <div>
              <p className="font-black text-white text-sm">Location Check-In</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{job.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Already checked in */}
          {alreadyCheckedIn && checkInRecord && (
            <div className="rounded-2xl p-4 text-center space-y-2"
              style={{ background: "rgba(76,122,45,0.1)", border: "1px solid rgba(76,122,45,0.3)" }}>
              <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: "#6DBF4A" }} />
              <p className="font-black text-white">Already Checked In ✓</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {new Date(checkInRecord.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-xs" style={{ color: "#6DBF4A" }}>
                Distance: {formatDistance(checkInRecord.distanceKm)}
              </p>
            </div>
          )}

          {/* Loading phases */}
          {!alreadyCheckedIn && phase !== "done" && phase !== "error" && (
            <div className="rounded-2xl p-6 text-center space-y-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: "#6DBF4A" }} />
              <p className="text-sm font-semibold text-white">{phaseLabel[phase]}</p>
              <div className="flex justify-center gap-2">
                {["geocoding", "locating", "checking"].map((p, i) => (
                  <div key={p} className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: ["geocoding", "locating", "checking"].indexOf(phase) >= i
                        ? "#6DBF4A" : "rgba(255,255,255,0.15)"
                    }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#F87171" }} />
                <p className="text-sm" style={{ color: "#F87171" }}>{errMsg}</p>
              </div>
              <button onClick={runLocationCheck}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </button>
            </div>
          )}

          {/* Result */}
          {!alreadyCheckedIn && phase === "done" && distance !== null && (
            <div className="space-y-4">

              {/* Distance card */}
              <div className="rounded-2xl p-4 text-center"
                style={{
                  background: withinRange ? "rgba(76,122,45,0.1)" : "rgba(228,87,46,0.08)",
                  border: `1px solid ${withinRange ? "rgba(76,122,45,0.3)" : "rgba(228,87,46,0.3)"}`,
                }}>
                <p className="text-3xl font-black mb-1" style={{ color: withinRange ? "#6DBF4A" : "#E4572E" }}>
                  {formatDistance(distance)}
                </p>
                <p className="text-xs font-semibold" style={{ color: withinRange ? "#6DBF4A" : "#E4572E" }}>
                  {withinRange ? "✓ Within range" : "✗ Too far from job location"}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Max allowed: {formatDistance(MAX_DISTANCE_KM)}
                </p>
              </div>

              {/* Job address */}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{jobAddress}</p>
              </div>

              {/* Refresh location */}
              <button onClick={runLocationCheck}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                <RefreshCw className="w-3 h-3" /> Refresh Location
              </button>

              {/* Check-in button */}
              <button
                onClick={handleCheckIn}
                disabled={!withinRange}
                className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all"
                style={withinRange ? {
                  background: "linear-gradient(135deg, #2F4F2F, #4C7A2D)",
                  boxShadow: "0 0 24px rgba(76,122,45,0.4)",
                  cursor: "pointer",
                } : {
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.3)",
                  cursor: "not-allowed",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                {withinRange
                  ? "✓ Mark Attendance & Start Job"
                  : `Move within ${formatDistance(MAX_DISTANCE_KM)} to check in`}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
