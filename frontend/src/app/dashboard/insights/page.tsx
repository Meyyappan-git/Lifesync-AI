"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { guestInsights } from "@/lib/guest-sample";
import { Sparkles, AlertTriangle, CalendarClock } from "lucide-react";

interface InsightData {
  alerts: Array<{ title: string; risk_level: string; reason: string; recommended_action: string }>;
  reminders: Array<{ title: string; message: string | null }>;
  document_count: number;
}

function InsightsContent() {
  const [data, setData] = useState<InsightData | null>(null);
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  useEffect(() => {
    if (guestMode) {
      setData(guestInsights);
      return;
    }
    apiClient.get<InsightData>("/api/v1/lifesync/insights").then(setData).catch(() => setData(null));
  }, [guestMode]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-700">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">AI Insights</h1>
            <p className="text-sm text-slate-600">Your documents and profile are turned into proactive alerts and guidance.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-slate-900">Suggested alerts</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(data?.alerts || []).map((alert, index) => (
              <div key={`${alert.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                <p className="mt-1 text-sm text-slate-600">{alert.reason}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{alert.risk_level}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-cyan-700">
            <CalendarClock className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-slate-900">Recommended reminders</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(data?.reminders || []).map((reminder, index) => (
              <div key={`${reminder.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-sm font-medium text-slate-900">{reminder.title}</p>
                <p className="mt-1 text-sm text-slate-600">{reminder.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Stored documents: {data?.document_count ?? 0}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="text-slate-600 text-sm p-4">Loading Insights...</div>}>
      <InsightsContent />
    </Suspense>
  );
}
