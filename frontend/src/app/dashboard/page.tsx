"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Activity, 
  Plus, 
  FileText, 
  LogOut, 
  User as UserIcon, 
  Calendar, 
  ChevronRight, 
  ShieldAlert, 
  HeartHandshake 
} from "lucide-react";

interface HealthReport {
  id: number;
  report_type: string;
  created_at: string;
  cautions?: string;
  remedies?: string;
  manual_data?: {
    symptoms: string;
    age: number;
  };
}

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) {
      apiClient.get<HealthReport[]>("/api/v1/health/history")
        .then((data) => {
          setReports(data);
        })
        .catch((err) => {
          console.error("Failed to load history", err);
        })
        .finally(() => {
          setFetching(false);
        });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-zinc-400 font-medium">Synchronizing health profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto" />
          <h2 className="text-2xl font-bold">Access Restrained</h2>
          <p className="text-zinc-400">Please sign in to view your personalized health dashboard and predictions.</p>
          <Link href="/login">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 mt-4">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = user.first_name ? `${user.first_name} ${user.last_name || ""}` : user.email;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-8 w-8 text-indigo-500" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              LifeSync AI
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <UserIcon className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">{displayName}</span>
            </div>
            
            <button 
              onClick={logout}
              className="flex items-center justify-center p-2 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition-all"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 to-purple-950 border border-indigo-500/20 p-8 sm:p-10">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl space-y-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Hello, <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{user.first_name || "there"}</span>
            </h1>
            <p className="text-zinc-300 text-lg leading-relaxed">
              Analyze new medical report documents or report symptoms manually to predict health caution metrics and obtain guided corrective remedies.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard/new">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                  <Plus className="h-5 w-5" /> Start New Analysis
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Dynamic Risk Indicator & Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm font-medium">Core Diagnostics</p>
              <h3 className="text-2xl font-bold mt-1">Active</h3>
              <p className="text-xs text-zinc-500 mt-1">Real-time heuristics enabled</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm font-medium">Analyses Stored</p>
              <h3 className="text-2xl font-bold mt-1">{reports.length}</h3>
              <p className="text-xs text-zinc-500 mt-1">Historical reports recorded</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm font-medium">Last Assessed</p>
              <h3 className="text-2xl font-bold mt-1">
                {reports.length > 0 
                  ? new Date(reports[0].created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) 
                  : "N/A"}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Latest prediction update</p>
            </div>
          </div>
        </div>

        {/* History / Action Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" /> Assessment History
            </h2>
          </div>

          <div className="divide-y divide-zinc-800">
            {fetching ? (
              <div className="p-12 text-center text-zinc-500">
                <Activity className="h-6 w-6 animate-spin mx-auto text-zinc-600 mb-2" />
                Loading historical data...
              </div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <p className="text-zinc-400">You haven't run any health predictions yet.</p>
                <Link href="/dashboard/new">
                  <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                    Run First Report
                  </Button>
                </Link>
              </div>
            ) : (
              reports.map((report) => (
                <Link 
                  key={report.id} 
                  href={`/dashboard/report/${report.id}`}
                  className="block p-6 hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${
                          report.report_type === "file" 
                            ? "bg-cyan-500/10 text-cyan-400 ring-cyan-400/20" 
                            : "bg-indigo-500/10 text-indigo-400 ring-indigo-400/20"
                        }`}>
                          {report.report_type === "file" ? "Medical Document Scan" : "Manual Self-Assessment"}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-zinc-200 mt-1 line-clamp-1">
                        {report.report_type === "manual" && report.manual_data
                          ? `Symptoms: ${report.manual_data.symptoms}`
                          : "Document Scan Analysis"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-400">
                      <span className="text-sm">View Report</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
