import { LoaderCircle, MapPin, Navigation } from "lucide-react";
import { useState } from "react";
import { buildMapsDirectionsUrl, buildMapsSearchUrl } from "../utils/mapLinks";

const openInNewTab = (url) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

export default function MapLink({
  address,
  className = "",
  label = "Open in Maps",
  showDirections = true,
}) {
  const [loadingDirections, setLoadingDirections] = useState(false);

  if (!address?.trim()) return null;

  const trimmedAddress = address.trim();
  const searchUrl = buildMapsSearchUrl(trimmedAddress);

  const handleDirectionsClick = () => {
    if (!navigator.geolocation) {
      openInNewTab(buildMapsDirectionsUrl(trimmedAddress));
      return;
    }

    setLoadingDirections(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = `${position.coords.latitude},${position.coords.longitude}`;
        openInNewTab(buildMapsDirectionsUrl(trimmedAddress, origin));
        setLoadingDirections(false);
      },
      () => {
        openInNewTab(buildMapsDirectionsUrl(trimmedAddress));
        setLoadingDirections(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900 hover:underline"
        onClick={() => openInNewTab(searchUrl)}
        type="button"
      >
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span>{label}</span>
      </button>

      {showDirections ? (
        <button
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100 hover:text-sky-900 hover:underline disabled:cursor-wait disabled:opacity-70"
          disabled={loadingDirections}
          onClick={handleDirectionsClick}
          type="button"
        >
          {loadingDirections ? (
            <LoaderCircle className="h-4 w-4 animate-spin flex-shrink-0" />
          ) : (
            <Navigation className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{loadingDirections ? "Getting location..." : "Get Directions"}</span>
        </button>
      ) : null}
    </div>
  );
}
