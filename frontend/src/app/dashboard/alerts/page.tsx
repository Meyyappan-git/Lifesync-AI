"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { ShieldAlert, Sparkles } from "lucide-react";

interface AlertItem {
  id: number;
  title: string;
  risk_level: string;
  reason: string;
  recommended_action: string;
  deadline: string | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    apiClient.get<{ alerts: AlertItem[] }>('/api/v1/lifesync/dashboard').then((data) => setAlerts(data.alerts || [])).catch(() => setAlerts([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Cross-Domain Risk Alerts</h1>
            <p className="text-sm text-zinc-400">AI highlights hidden conflicts across travel, health, finance, and documents.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">{alert.title}</h2>
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-xs text-amber-300">{alert.risk_level}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{alert.reason}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-indigo-300">
                <Sparkles className="h-4 w-4" />
                {alert.deadline ? new Date(alert.deadline).toLocaleDateString() : 'No deadline'}
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-300">Recommended action: {alert.recommended_action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
