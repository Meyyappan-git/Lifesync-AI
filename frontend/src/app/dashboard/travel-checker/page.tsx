"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Plane, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TravelCheck {
  name: string;
  status: boolean;
}

function TravelCheckerContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  const [score, setScore] = useState<number>(66);
  const [checks, setChecks] = useState<TravelCheck[]>([
    { name: "Passport Validity (>6 Months)", status: false },
    { name: "Valid Visa Document", status: false },
    { name: "Flight Booking Confirmation", status: true },
    { name: "Hotel Booking Confirmation", status: true },
    { name: "Travel Insurance Policy", status: true },
    { name: "Vaccination Records", status: true }
  ]);

  useEffect(() => {
    if (!guestMode) {
      apiClient.get<{ readiness_score: number; checks: TravelCheck[] }>("/api/v1/lifesync/travel-readiness")
        .then(res => {
          setScore(res.readiness_score);
          setChecks(res.checks);
        })
        .catch(() => {});
    }
  }, [guestMode]);

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-cyan-900/40 bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-zinc-950 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-cyan-500/20 border border-cyan-500/30 p-4 text-cyan-400">
            <Plane className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">AI Travel Readiness Checker</h1>
            <p className="text-sm text-zinc-400 mt-1">Automatic verification of Passport, Visa, Flights, Hotels & Insurance before departure.</p>
          </div>
        </div>

        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Readiness Score</span>
          <span className="text-3xl font-extrabold text-cyan-400">{score}%</span>
        </div>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((c, i) => (
          <div key={i} className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {c.status ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400 shrink-0" />
              )}
              <span className="text-sm font-bold text-white">{c.name}</span>
            </div>
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${c.status ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {c.status ? "VERIFIED" : "MISSING"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TravelCheckerPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm p-4">Loading Travel Checker...</div>}>
      <TravelCheckerContent />
    </Suspense>
  );
}
