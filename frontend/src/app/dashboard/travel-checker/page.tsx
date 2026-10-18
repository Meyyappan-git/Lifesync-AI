"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import {
  Plane,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Globe2,
  MapPin,
  FileUp,
  RefreshCw,
  Info,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TravelCheckItem {
  name: string;
  required: boolean;
  status: boolean;
  details?: string;
  recommendation?: string;
}

interface TravelReadinessData {
  readiness_score: number;
  destination: string;
  trip_type: string;
  departure_date?: string | null;
  checks: TravelCheckItem[];
  missing_count: number;
  advisories: string[];
}

const POPULAR_DESTINATIONS = [
  { label: "Schengen Area (France, Germany, Italy...)", type: "schengen", name: "Schengen Area" },
  { label: "United States (ESTA / B1/B2)", type: "international", name: "United States" },
  { label: "United Kingdom", type: "international", name: "United Kingdom" },
  { label: "Japan", type: "international", name: "Japan" },
  { label: "Domestic / Local Travel", type: "domestic", name: "Domestic" },
];

function TravelCheckerContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  const [destination, setDestination] = useState<string>("Schengen Area");
  const [tripType, setTripType] = useState<string>("schengen");
  const [departureDate, setDepartureDate] = useState<string>(() => {
    // Default departure date 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const [data, setData] = useState<TravelReadinessData>({
    readiness_score: 60,
    destination: "Schengen Area",
    trip_type: "schengen",
    departure_date: null,
    checks: [
      {
        name: "Passport Validity (3+ Months Beyond Return)",
        required: true,
        status: true,
        details: "Passport on file",
        recommendation: "Ensure valid 3+ months past departure."
      },
      {
        name: "Schengen Visa / ETIAS Authorization",
        required: true,
        status: false,
        details: "Missing visa or entry permit",
        recommendation: "Apply at consulate at least 15 days before departure."
      },
      {
        name: "Schengen Travel Medical Insurance (€30,000+)",
        required: true,
        status: true,
        details: "Policy covers €50,000 emergency evacuation",
        recommendation: "Carry printed certificate with policy number."
      },
      {
        name: "Round-trip Flight Reservation",
        required: true,
        status: true,
        details: "Flight booking verified",
        recommendation: "Download airline app for boarding passes."
      },
      {
        name: "Hotel Booking / Accommodation Proof",
        required: true,
        status: false,
        details: "Missing hotel confirmation",
        recommendation: "Have lodging confirmation available at border."
      }
    ],
    missing_count: 2,
    advisories: [
      "Schengen border authorities strictly enforce mandatory €30,000 emergency medical insurance.",
      "Ensure passport was issued within the last 10 years with at least 2 blank pages.",
      "Keep proof of financial funds and itinerary readily accessible at immigration."
    ]
  });

  const runEvaluation = async (dest = destination, tType = tripType, depDate = departureDate) => {
    if (guestMode) return;
    setIsEvaluating(true);
    try {
      const res = await apiClient.post<TravelReadinessData>("/api/v1/lifesync/travel-readiness/check", {
        destination: dest,
        trip_type: tType,
        departure_date: depDate || null
      });
      setData(res);
    } catch {
      // Fallback to GET if needed
      try {
        const fallback = await apiClient.get<TravelReadinessData>(
          `/api/v1/lifesync/travel-readiness?destination=${encodeURIComponent(dest)}&trip_type=${encodeURIComponent(tType)}&departure_date=${encodeURIComponent(depDate || "")}`
        );
        setData(fallback);
      } catch {
        // keep current state
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    if (!guestMode) {
      runEvaluation(destination, tripType, departureDate);
    }
  }, [guestMode]);

  const handlePresetSelect = (preset: typeof POPULAR_DESTINATIONS[0]) => {
    setDestination(preset.name);
    setTripType(preset.type);
    runEvaluation(preset.name, preset.type, departureDate);
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl border border-cyan-200/40 bg-gradient-to-r from-cyan-50/40 via-slate-50 to-slate-50 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-cyan-500/20 border border-cyan-500/30 p-4 text-cyan-700">
            <Plane className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">AI Travel Readiness Checker</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-700 border border-cyan-500/30">
                Live Engine
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Automated compliance auditing for Passports, Visas, Tickets, Lodging, and Insurance rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white/90 p-4 rounded-2xl border border-slate-200 text-center min-w-[130px] shadow-lg">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Readiness Score</span>
            <span className={`text-3xl font-black ${data.readiness_score >= 80 ? 'text-emerald-700' : data.readiness_score >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
              {data.readiness_score}%
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${data.readiness_score >= 80 ? 'bg-emerald-400' : data.readiness_score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${Math.max(5, data.readiness_score)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trip Configuration Section */}
      <div className="rounded-2xl bg-white/70 border border-slate-200 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-cyan-700" />
            <h2 className="text-base font-bold text-slate-900">Configure Your Upcoming Trip</h2>
          </div>
          <span className="text-xs text-slate-600">Rules adapt automatically based on destination rules</span>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_DESTINATIONS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                  destination === preset.name && tripType === preset.type
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Destination Name</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. France, United States, Japan"
                className="w-full bg-slate-50 border border-slate-300/80 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Trip Type / Region</label>
            <select
              value={tripType}
              onChange={(e) => setTripType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300/80 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-cyan-500"
            >
              <option value="schengen">Schengen Area (EU 3-Month + €30k Rule)</option>
              <option value="international">General International (6-Month Passport Rule)</option>
              <option value="domestic">Domestic Travel (Photo ID + Transit)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Planned Departure Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300/80 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${data.missing_count === 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {data.missing_count === 0 ? "All mandatory travel requirements satisfied!" : `${data.missing_count} required item(s) currently missing`}
          </div>

          <Button
            onClick={() => runEvaluation()}
            disabled={isEvaluating}
            className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            {isEvaluating ? "Auditing Vault..." : "Re-evaluate Readiness"}
          </Button>
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-700" />
            Requirement Checklist
          </h2>
          <Link href="/dashboard/upload">
            <Button variant="outline" className="text-xs h-8 border-cyan-200 text-cyan-700 hover:bg-cyan-50/50 flex items-center gap-1.5">
              <FileUp className="w-3.5 h-3.5" />
              Upload Missing Document
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.checks.map((c, i) => (
            <div
              key={i}
              className={`p-5 rounded-2xl bg-white/80 border transition-all ${
                c.status
                  ? 'border-slate-200 hover:border-slate-300'
                  : 'border-red-200/40 bg-gradient-to-br from-red-50/10 via-slate-50/90 to-slate-50/90'
              } flex flex-col justify-between gap-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {c.status ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">{c.name}</span>
                    {c.details && (
                      <span className="text-xs text-slate-600 mt-0.5 block">{c.details}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    c.status
                      ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-700 border border-red-500/30'
                  }`}>
                    {c.status ? "VERIFIED" : "MISSING"}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    {c.required ? "Mandatory" : "Recommended"}
                  </span>
                </div>
              </div>

              {c.recommendation && (
                <div className="mt-1 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-700 shrink-0 mt-0.5" />
                  <span>{c.recommendation}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Advisories & Key Travel Rules */}
      {data.advisories && data.advisories.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Important Border & Destination Guidelines ({destination})</span>
          </div>
          <ul className="space-y-2">
            {data.advisories.map((advisory, idx) => (
              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="text-amber-700 font-black">•</span>
                <span>{advisory}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TravelCheckerPage() {
  return (
    <Suspense fallback={<div className="text-slate-600 text-sm p-4">Loading Travel Checker...</div>}>
      <TravelCheckerContent />
    </Suspense>
  );
}
