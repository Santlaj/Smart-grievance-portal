import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Compass,
  X,
  Check,
  Search,
  Building2,
  Navigation,
  Loader2,
  AlertCircle,
  LocateFixed,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Button } from "../ui/Button";
import { toast } from "sonner";
import authService from "../../services/authService";

const POPULAR_LOCATIONS = [
  "Sarean, Bihar",
  "Sasaram, Rohtas",
  "Patna, Bihar",
  "Gaya, Bihar",
  "Indiranagar, Bengaluru",
  "Andheri West, Mumbai",
  "Connaught Place, Central",
  "Banjara Hills, Hyderabad",
  "Koregaon Park, Pune",
  "T. Nagar, Chennai",
  "Salt Lake, Kolkata",
  "Sector 14, Gurugram",
  "Sector 62, Noida",
  "Civil Lines, Jaipur",
  "Gomti Nagar, Lucknow",
];

// Helper to format Nominatim address object into clean locality string
function formatNominatimAddress(item) {
  if (!item) return "";
  const addr = item.address || {};

  const villageOrLocality =
    addr.village ||
    addr.hamlet ||
    addr.suburb ||
    addr.neighbourhood ||
    addr.residential ||
    addr.town ||
    addr.city;

  const district =
    addr.district ||
    addr.state_district ||
    addr.subdistrict ||
    addr.county ||
    addr.city;

  const state = addr.state;

  if (villageOrLocality && state) {
    if (district && district !== villageOrLocality) {
      return `${villageOrLocality}, ${district}, ${state}`;
    }
    return `${villageOrLocality}, ${state}`;
  }

  if (item.display_name) {
    const parts = item.display_name.split(",").map((p) => p.trim());
    return parts.slice(0, 3).join(", ");
  }

  return "";
}

export default function LocationSelectorModal({ isOpen, onClose }) {
  const { user, selectedLocation, setSelectedLocation, updateUser } = useAuth();
  const { t } = useLanguage();
  const [customInput, setCustomInput] = useState("");
  const [detectingGps, setDetectingGps] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCustomInput("");
      setSearchResults([]);
    }
  }, [isOpen]);

  // Live place search with debounce
  useEffect(() => {
    if (!customInput || customInput.trim().length < 2) {
      setSearchResults([]);
      setSearchingPlaces(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingPlaces(true);
      try {
        const query = customInput.trim();
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(
            query
          )}`
        );
        if (res.ok) {
          const list = await res.json();
          const parsed = list
            .map((item) => ({
              id: item.place_id,
              formatted: formatNominatimAddress(item),
              raw: item.display_name,
            }))
            .filter((i) => Boolean(i.formatted));
          setSearchResults(parsed);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingPlaces(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [customInput]);

  if (!isOpen) return null;

  const handleSelect = async (locName) => {
    const trimmed = (locName || "").trim();
    if (!trimmed) return;

    setSelectedLocation(trimmed);

    // If citizen is logged in, optionally sync to their profile address
    if (user?.token) {
      try {
        const updated = await authService.updateProfile({ address: trimmed });
        if (updated) {
          updateUser({ address: trimmed });
        }
      } catch {
        // Local preference already saved
      }
    }

    toast.success(`Location set to: ${trimmed}`);
    onClose();
  };

  // High-Accuracy GPS Detection with Village/Locality hierarchy
  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let detectedLabel = `GPS (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;

        // Reverse geocoding with maximum zoom and address details
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${latitude}&lon=${longitude}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            const formatted = formatNominatimAddress(data);
            if (formatted) {
              detectedLabel = formatted;
            }
          }
        } catch {
          // fallback to coordinates label
        }

        setDetectingGps(false);
        handleSelect(detectedLabel);
      },
      (err) => {
        setDetectingGps(false);
        toast.error("Could not retrieve GPS location. Please type your village or city below.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const filteredPopular = POPULAR_LOCATIONS.filter((loc) =>
    loc.toLowerCase().includes((searchFilter || "").toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Select Your Location
              </h2>
              <p className="text-xs text-slate-500">
                Grievances and civic notices will adapt to your chosen area
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Active Location display */}
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400">Current Area</p>
              <p className="text-xs font-black text-slate-900 truncate">
                {selectedLocation || "Not Selected"}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
            Active
          </span>
        </div>

        {/* 1. GPS Auto-Detect Button */}
        <div className="space-y-1">
          <Button
            type="button"
            onClick={handleGpsDetect}
            disabled={detectingGps}
            className="w-full h-11 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs gap-2 rounded-2xl cursor-pointer"
          >
            <Compass className={`h-4 w-4 ${detectingGps ? "animate-spin text-blue-600" : ""}`} />
            <span>{detectingGps ? "Detecting GPS location..." : "Use My Current GPS Location"}</span>
          </Button>
          <p className="text-[10px] text-slate-400 px-1">
            * Desktop browsers may detect your ISP routing hub (e.g. Danapur). If inaccurate, type your village or city below.
          </p>
        </div>

        {/* 2. Custom Type & Live Search Autocomplete */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Type Your Village, City, or Ward:
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Sarean, Bihar or Sasaram"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                setSearchFilter(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customInput.trim()) {
                  handleSelect(customInput);
                }
              }}
              className="w-full h-10 pl-9 pr-14 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="button"
              disabled={!customInput.trim()}
              onClick={() => handleSelect(customInput)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition"
            >
              Set
            </button>
          </div>

          {/* Live Autocomplete Results from OpenStreetMap Places */}
          {searchingPlaces && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              <span>Searching locations across India…</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-2 space-y-1 max-h-40 overflow-y-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 px-2 block">
                Matching Places:
              </span>
              {searchResults.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSelect(place.formatted)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white text-xs font-semibold text-slate-800 transition flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2">{place.formatted}</span>
                  <span className="text-[10px] text-blue-600 font-bold group-hover:underline shrink-0">
                    Select →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Popular Localities / Cities */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Suggested Localities & Cities:
          </span>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
            {filteredPopular.map((loc) => {
              const isSelected = selectedLocation?.toLowerCase() === loc.toLowerCase();
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/60"
                  }`}
                >
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span>{loc}</span>
                  {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
