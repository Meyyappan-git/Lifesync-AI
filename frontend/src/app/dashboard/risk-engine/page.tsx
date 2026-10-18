"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, Zap, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

interface RiskAlert {
  id: number;
  title: string;
  risk_level: string;
  reason: string;
  recommended_action: string;
  deadline?: string;
  folders?: string[];
}

interface DashboardData {
  risks: RiskAlert[];
}

function RiskEngineContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  const [risks, setRisks] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [resolvedTitles, setResolvedTitles] = useState<string[]>([]);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    if (guestMode) {
      setRisks([]);
      setLoading(false);
      return;
    }

    apiClient
      .get<DashboardData>("/api/v1/lifesync/dashboard")
      .then((data) => {
        setRisks(data?.risks || []);
        setError(null);
      })
      .catch(() => {
        setError("Could not load risk data. Make sure you are signed in.");
        setRisks([]);
      })
      .finally(() => setLoading(false));

    apiClient
      .get<string[]>("/api/v1/lifesync/risks/resolved")
      .then((titles) => setResolvedTitles(titles || []))
      .catch(() => {});
  }, [guestMode]);

  const toggleResolve = async (title: string) => {
    const isCurrentlyResolved = resolvedTitles.includes(title);
    const nextState = !isCurrentlyResolved;
    setResolvedTitles((prev) =>
      nextState ? [...prev, title] : prev.filter((t) => t !== title)
    );

    if (!guestMode) {
      try {
        await apiClient.post("/api/v1/lifesync/risks/resolve", {
          risk_title: title,
          is_resolved: nextState,
        });
      } catch {
        setResolvedTitles((prev) =>
          isCurrentlyResolved ? [...prev, title] : prev.filter((t) => t !== title)
        );
      }
    }
  };

  const filteredRisks = risks
    .filter((r) => showResolved ? resolvedTitles.includes(r.title) : !resolvedTitles.includes(r.title))
    .filter((r) => {
      if (activeFilter === "CRITICAL") return r.risk_level?.toLowerCase() === "critical";
      if (activeFilter === "HIGH") return r.risk_level?.toLowerCase() === "high";
      if (activeFilter === "MEDIUM") return r.risk_level?.toLowerCase() === "medium";
      return true;
    });


  const criticalCount = risks.filter((r) => r.risk_level?.toLowerCase() === "critical").length;
  const highCount = risks.filter((r) => r.risk_level?.toLowerCase() === "high").length;
  const mediumCount = risks.filter((r) => r.risk_level?.toLowerCase() === "medium").length;

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="rounded-3xl border border-red-200/40 bg-gradient-to-r from-red-50/40 via-slate-50 to-slate-50 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-red-500/20 border border-red-500/30 p-4 text-red-700">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-700 text-xs font-bold uppercase tracking-wider mb-1">
              Core AI Innovation
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Cross-Domain Risk Correlation Engine</h1>
            <p className="text-sm text-slate-600 mt-1">
              Correlating data across your uploaded documents to identify real compound risks.
            </p>
          </div>
        </div>

        {/* Summary badges */}
        {!loading && risks.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {criticalCount > 0 && (
              <span className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/20 text-red-700 border border-red-500/30">
                {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-700 border border-amber-500/30">
                {highCount} High
              </span>
            )}
            {mediumCount > 0 && (
              <span className="px-3 py-2 rounded-xl text-xs font-bold bg-teal-500/20 text-teal-700 border border-teal-500/30">
                {mediumCount} Medium
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-50/40 p-4 text-sm text-rose-700">
          {error}{" "}
          <a href="/login" className="underline text-rose-700 ml-2">Sign in</a>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-16 justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          <p className="text-slate-600">Analysing your documents for risks…</p>
        </div>
      )}

      {/* Empty state — no docs uploaded yet */}
      {!loading && !error && risks.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-16 text-center space-y-5">
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 inline-flex mx-auto">
            <ShieldCheck className="h-12 w-12 text-emerald-700" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No Risks Detected</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            The risk engine analyses your uploaded documents and cross-references them to surface
            compound risks. Upload documents in your folders to begin risk analysis.
          </p>
          <a
            href="/dashboard/folders"
            className="inline-flex items-center gap-2 mt-4 px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold transition-colors"
          >
            <FolderOpen className="h-4 w-4" /> Go to Folders &amp; Upload Documents
          </a>
        </div>
      )}

      {/* Filter tabs — only shown when risks exist */}
      {!loading && risks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((f) => (
              <Button
                key={f}
                onClick={() => setActiveFilter(f)}
                variant={activeFilter === f ? "default" : "outline"}
                className={`rounded-xl text-xs font-bold px-4 py-2 ${
                  activeFilter === f
                    ? "bg-teal-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                }`}
              >
                {f} ALERTS
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowResolved(!showResolved)}
              variant="outline"
              className={`rounded-xl text-xs font-bold px-3.5 py-2 transition-all ${
                showResolved
                  ? "border-emerald-500/50 bg-emerald-50/40 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:text-slate-800"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-700" />
              {showResolved ? "Showing Resolved" : `Resolved (${resolvedTitles.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* Risk Cards */}
      {!loading && filteredRisks.length > 0 && (
        <div className="space-y-4">
          {filteredRisks.map((risk, idx) => {
            const level = risk.risk_level?.toLowerCase();
            const isResolved = resolvedTitles.includes(risk.title);
            return (
              <div
                key={idx}
                className={`p-6 rounded-3xl border shadow-xl transition-all space-y-4 ${
                  isResolved
                    ? "bg-slate-50/60 border-slate-200/60 opacity-80"
                    : "bg-white/80 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                        level === "critical"
                          ? "bg-red-500/20 text-red-700 border border-red-500/30"
                          : level === "high"
                          ? "bg-amber-500/20 text-amber-700 border border-amber-500/30"
                          : "bg-teal-500/20 text-teal-700 border border-teal-500/30"
                      }`}
                    >
                      {risk.risk_level} LEVEL
                    </span>
                    {risk.folders && risk.folders.length > 0 && (
                      <span className="text-xs font-mono text-slate-500">
                        Source: {risk.folders.join(" + ")} Folder
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {risk.deadline && (
                      <span className="text-xs font-mono text-slate-600">
                        Deadline: <strong className="text-slate-900">{risk.deadline}</strong>
                      </span>
                    )}
                    <Button
                      onClick={() => toggleResolve(risk.title)}
                      variant="outline"
                      className={`rounded-xl text-xs transition-all ${
                        isResolved
                          ? "border-emerald-500/40 bg-emerald-50/30 text-emerald-700 hover:bg-emerald-50/40"
                          : "border-slate-300 text-slate-700 hover:border-emerald-500/40 hover:text-emerald-700"
                      }`}
                    >
                      {isResolved ? "Mark Unresolved" : "Resolve Risk"}
                    </Button>
                  </div>
                </div>


                <div>
                  <h3 className="text-lg font-bold text-slate-900">{risk.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{risk.reason}</p>
                </div>

                {risk.recommended_action && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-teal-700 font-medium flex items-center gap-3">
                    <Zap className="h-4 w-4 text-teal-700 shrink-0" />
                    <span>
                      <strong>AI Recommended Action:</strong> {risk.recommended_action}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* All resolved state */}
      {!loading && risks.length > 0 && filteredRisks.length === 0 && (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-50/20 p-12 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-700 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">All risks in this category resolved!</h2>
          <p className="text-sm text-slate-600">
            Switch filter or upload more documents to get new risk analysis.
          </p>
        </div>
      )}
    </div>
  );
}

export default function RiskEnginePage() {
  return (
    <Suspense fallback={<div className="text-slate-600 text-sm p-4">Loading Risk Engine...</div>}>
      <RiskEngineContent />
    </Suspense>
  );
}
