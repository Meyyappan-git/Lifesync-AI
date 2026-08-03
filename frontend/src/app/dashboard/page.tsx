"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Activity, FileText, ShieldAlert, Sparkles, CalendarDays, FolderKanban, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  folders: Array<{ id: number; name: string; description: string | null; document_count: number }>;
  documents: Array<{ id: number; name: string; file_type: string | null; folder_id: number | null; created_at: string | null }>;
  alerts: Array<{ id: number; title: string; risk_level: string; reason: string; recommended_action: string; deadline: string | null }>;
  reminders: Array<{ id: number; title: string; message: string | null; trigger_time: string | null }>;
  activity: Array<{ id: number; action: string; details: string | null; created_at: string | null }>;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (guestMode && !user) {
      setData({
        folders: [
          { id: 1, name: "Health", description: "AI-organized health records", document_count: 8 },
          { id: 2, name: "Finance", description: "Payment, insurance, and billing history", document_count: 5 },
          { id: 3, name: "Travel", description: "Risk alerts for upcoming trips", document_count: 3 },
          { id: 4, name: "Emergency", description: "Critical records and instructions", document_count: 2 },
        ],
        documents: [
          { id: 1, name: "Annual Health Check.pdf", file_type: "pdf", folder_id: 1, created_at: "2026-08-01T09:15:00Z" },
          { id: 2, name: "Medication Plan.docx", file_type: "docx", folder_id: 1, created_at: "2026-08-02T11:40:00Z" },
          { id: 3, name: "Insurance Summary.pdf", file_type: "pdf", folder_id: 2, created_at: "2026-07-28T14:20:00Z" },
        ],
        alerts: [
          { id: 1, title: "Dehydration Risk", risk_level: "Moderate", reason: "Weather forecast indicates heat exposure", recommended_action: "Increase water intake and avoid midday sun.", deadline: "2026-08-05T08:00:00Z" },
          { id: 2, title: "Medication Reminder", risk_level: "Low", reason: "Missed your daily medication window.", recommended_action: "Take prescribed medication and update schedule.", deadline: "2026-08-03T18:00:00Z" },
        ],
        reminders: [
          { id: 1, title: "Schedule annual checkup", message: "Book an appointment with your primary care provider.", trigger_time: "2026-08-07T10:00:00Z" },
          { id: 2, title: "Upload lab results", message: "Add your latest blood test report for better insights.", trigger_time: "2026-08-06T15:00:00Z" },
        ],
        activity: [
          { id: 1, action: "Guest preview started", details: "Explore the LifeSync AI interface without logging in.", created_at: new Date().toISOString() },
          { id: 2, action: "AI health alert generated", details: "Detected a moderate dehydration signal from your profile.", created_at: new Date().toISOString() },
        ],
      });
      return;
    }

    apiClient
      .get<DashboardData>("/api/v1/lifesync/dashboard")
      .then((res) => setData(res))
      .catch(() => setData(null));
  }, [guestMode, user]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">Loading your life dashboard...</div>;
  }

  if (!user && !guestMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
        <div className="max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900/90 p-10 shadow-xl">
          <h1 className="text-3xl font-semibold">Guest access required</h1>
          <p className="mt-4 text-zinc-400">
            You must sign in or use the guest preview to explore the dashboard. Click below to continue as a guest.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row justify-center">
            <Link href="/dashboard?guest=1" className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500">
              Continue as Guest
            </Link>
            <Link href="/login" className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-900">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950 to-purple-950 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-300">AI Life Command Center</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Welcome back, {user?.first_name || user?.email || "there"}.</h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-300">Track deadlines, upload documents, and uncover cross-domain risks before they become problems.</p>
          </div>
          <Link href="/dashboard/folders" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white">
            Open smart folders <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">Life Health Score</p>
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">87</p>
          <p className="mt-2 text-sm text-zinc-500">Strong readiness profile</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">Upcoming Alerts</p>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">{data?.alerts?.length || 0}</p>
          <p className="mt-2 text-sm text-zinc-500">AI risk signals active</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">Documents</p>
            <FileText className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">{data?.documents?.length || 0}</p>
          <p className="mt-2 text-sm text-zinc-500">Stored and classified</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">Reminders</p>
            <CalendarDays className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">{data?.reminders?.length || 0}</p>
          <p className="mt-2 text-sm text-zinc-500">Ready for follow-up</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Smart folders</h2>
            <Link href="/dashboard/folders" className="text-sm text-indigo-300">View all</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(data?.folders || []).slice(0, 4).map((folder) => (
              <div key={folder.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-center gap-2 text-indigo-300">
                  <FolderKanban className="h-4 w-4" />
                  <span className="text-sm font-medium">{folder.name}</span>
                </div>
                <p className="mt-3 text-sm text-zinc-400">{folder.description || "AI-classified folder"}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-500">{folder.document_count} documents</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Latest alerts</h2>
            <Link href="/dashboard/alerts" className="text-sm text-indigo-300">View all</Link>
          </div>
          <div className="mt-5 space-y-3">
            {(data?.alerts || []).slice(0, 3).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm font-medium text-white">{alert.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{alert.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Recent activity</h2>
          <div className="flex items-center gap-2 text-sm text-zinc-400"><Activity className="h-4 w-4" /> Live timeline</div>
        </div>
        <div className="mt-5 space-y-3">
          {(data?.activity || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{item.action}</p>
                <p className="text-sm text-zinc-400">{item.details}</p>
              </div>
              <p className="text-xs text-zinc-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "just now"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
