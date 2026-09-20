"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  Users, FileText, Shield, Activity, ShieldCheck,
  BarChart3, FolderKanban, CheckCircle2, AlertCircle, Crown, Upload
} from "lucide-react";

interface AdminLog {
  id: number;
  user_id: number | null;
  user_email: string | null;
  action: string;
  details: string | null;
  created_at: string | null;
}

interface FolderCount { folder: string; count: number; }
interface FileTypeCount { type: string; count: number; }
interface TopUploader { email: string; doc_count: number; }
interface ActionBreakdown { action: string; count: number; }

interface AdminMetrics {
  total_users: number;
  verified_users: number;
  admin_users: number;
  total_documents: number;
  total_activity_logs: number;
  system_status: string;
  folder_doc_counts: FolderCount[];
  file_type_breakdown: FileTypeCount[];
  top_uploaders: TopUploader[];
  action_breakdown: ActionBreakdown[];
  recent_activity_logs: AdminLog[];
}

const ACTION_COLOR: Record<string, string> = {
  UPLOAD_DOC: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  DELETE_DOC: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  USER_REGISTER: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  LOGIN: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  AI_ASSISTANT_QUERY: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  CROSS_DOMAIN_RISK: "text-amber-400 bg-amber-500/10 border-amber-500/30",
};

function actionColor(action: string) {
  return ACTION_COLOR[action] || "text-zinc-400 bg-zinc-800 border-zinc-700";
}

function AdminContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiClient
      .get<AdminMetrics>("/api/v1/lifesync/admin/metrics")
      .then((res) => setMetrics(res))
      .catch((err) => {
        if (err?.status === 403) {
          setError("Access denied — Admin role required.");
        } else {
          setError("Failed to load admin metrics. Make sure the backend is running.");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!guestMode) load();
    else {
      setError("Admin console is not available in guest mode.");
      setLoading(false);
    }
  }, [guestMode]);

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-500/20 border border-indigo-500/30 p-4 text-indigo-400">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">System Admin &amp; Audit Console</h1>
            <p className="text-sm text-zinc-400 mt-1">Real-time system metrics, user analytics, and audit log analysis.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {metrics && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
              metrics.system_status === "Healthy"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }`}>
              SYSTEM {metrics.system_status.toUpperCase()}
            </span>
          )}
          <button
            onClick={load}
            className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-xl transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-5 text-sm text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-16 justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-zinc-400">Loading live metrics…</p>
        </div>
      )}

      {metrics && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <Users className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Total Users</span>
              </div>
              <p className="text-4xl font-extrabold text-white">{metrics.total_users}</p>
              <p className="text-xs text-zinc-500">{metrics.verified_users} verified · {metrics.admin_users} admin</p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Documents Indexed</span>
              </div>
              <p className="text-4xl font-extrabold text-white">{metrics.total_documents}</p>
              <p className="text-xs text-zinc-500">Across all users &amp; folders</p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Activity Logs</span>
              </div>
              <p className="text-4xl font-extrabold text-indigo-400">{metrics.total_activity_logs}</p>
              <p className="text-xs text-zinc-500">Total system events</p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Verified Rate</span>
              </div>
              <p className="text-4xl font-extrabold text-emerald-400">
                {metrics.total_users > 0 ? Math.round((metrics.verified_users / metrics.total_users) * 100) : 0}%
              </p>
              <p className="text-xs text-zinc-500">Users with verified email</p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Docs per folder */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-indigo-400" /> Documents by Folder
              </h2>
              {metrics.folder_doc_counts.length === 0 ? (
                <p className="text-xs text-zinc-500">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.folder_doc_counts
                    .sort((a, b) => b.count - a.count)
                    .map((f) => {
                      const max = Math.max(...metrics.folder_doc_counts.map(x => x.count), 1);
                      const pct = Math.round((f.count / max) * 100);
                      return (
                        <div key={f.folder} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-300 font-medium">{f.folder}</span>
                            <span className="text-zinc-500 font-mono">{f.count} files</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* File type breakdown */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-400" /> File Type Breakdown
              </h2>
              {metrics.file_type_breakdown.length === 0 ? (
                <p className="text-xs text-zinc-500">No files uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.file_type_breakdown
                    .sort((a, b) => b.count - a.count)
                    .map((ft) => {
                      const max = Math.max(...metrics.file_type_breakdown.map(x => x.count), 1);
                      const pct = Math.round((ft.count / max) * 100);
                      return (
                        <div key={ft.type} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-mono text-zinc-300 uppercase">{ft.type || "UNKNOWN"}</span>
                            <span className="text-zinc-500">{ft.count}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Top uploaders */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" /> Top Uploaders
              </h2>
              {metrics.top_uploaders.filter(u => u.doc_count > 0).length === 0 ? (
                <p className="text-xs text-zinc-500">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.top_uploaders
                    .filter(u => u.doc_count > 0)
                    .map((u, i) => (
                      <div key={u.email} className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${i === 0 ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"}`}>
                          {i + 1}
                        </span>
                        <span className="text-xs text-zinc-300 truncate flex-1">{u.email}</span>
                        <span className="text-xs font-bold text-indigo-300">{u.doc_count} docs</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Action breakdown */}
          {metrics.action_breakdown.length > 0 && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" /> Activity Type Breakdown
              </h2>
              <div className="flex flex-wrap gap-3">
                {metrics.action_breakdown
                  .sort((a, b) => b.count - a.count)
                  .map((a) => (
                    <div
                      key={a.action}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${actionColor(a.action)}`}
                    >
                      <span>[{a.action}]</span>
                      <span className="font-mono">{a.count}×</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Activity logs */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> System Audit &amp; Activity Logs
              <span className="ml-auto text-zinc-500 font-normal normal-case text-xs">Latest 25 events</span>
            </h2>

            {metrics.recent_activity_logs.length === 0 ? (
              <p className="text-xs text-zinc-500">No activity logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {metrics.recent_activity_logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-extrabold shrink-0 ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <div className="min-w-0">
                        <p className="text-zinc-300 truncate">{log.details || "—"}</p>
                        <p className="text-zinc-600 mt-0.5">{log.user_email || `User #${log.user_id}`}</p>
                      </div>
                    </div>
                    <span className="text-zinc-500 font-mono shrink-0">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm p-4">Loading Admin Dashboard...</div>}>
      <AdminContent />
    </Suspense>
  );
}
