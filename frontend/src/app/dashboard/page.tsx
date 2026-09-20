"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { guestFolders, guestAlerts, guestReminders, guestActivity } from "@/lib/guest-sample";
import { 
  Activity, FileText, ShieldAlert, Sparkles, FolderKanban, 
  ArrowRight, Upload, AlertTriangle, CheckCircle2, Bot, RefreshCw,
  Clock, Calendar, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RiskItem {
  title: string;
  risk_level: string;
  reason: string;
  recommended_action: string;
  deadline?: string;
}

interface ExpiryItem {
  id: number;
  doc_name: string;
  folder_name: string;
  file_type?: string;
  expiry_date: string;
  days_left: number;
  urgency_status: "EXPIRED" | "CRITICAL" | "WARNING" | "HEALTHY";
}

interface DashboardData {
  health_score?: number;
  active_risks_count?: number;
  folder_completion_avg?: number;
  folder_stats?: Array<{ folder_id: number; folder_name: string; completion_pct: number; doc_count: number; missing_docs: string[] }>;
  risks?: RiskItem[];
  upcoming_expiries?: ExpiryItem[];
  documents?: Array<{ id: number; name: string; file_type: string | null; folder_name: string; created_at: string | null }>;
  reminders?: Array<{ id: number; title: string; message: string | null; trigger_time: string | null }>;
  activity?: Array<{ id: number; action: string; details: string | null; created_at: string | null }>;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDashboard = () => {
    if (guestMode && !user) {
      setData({
        health_score: 88,
        active_risks_count: 2,
        folder_completion_avg: 79,
        folder_stats: [
          { folder_id: 1, folder_name: "Vehicle", completion_pct: 80, doc_count: 4, missing_docs: ["PUC Certificate"] },
          { folder_id: 2, folder_name: "Travel", completion_pct: 60, doc_count: 3, missing_docs: ["Visa", "Travel Insurance"] },
          { folder_id: 3, folder_name: "Health", completion_pct: 100, doc_count: 5, missing_docs: [] },
          { folder_id: 4, folder_name: "Finance", completion_pct: 75, doc_count: 3, missing_docs: ["Tax Return"] },
        ],
        risks: [
          {
            title: "Critical Travel Risk: Passport Expiring Before International Flight",
            risk_level: "Critical",
            reason: "Flight ticket found, but Passport expires within 6 months.",
            recommended_action: "Renew Passport immediately via Passport Seva / Embassy.",
            deadline: "2026-09-15"
          },
          {
            title: "Expired DL + Active Vehicle Ownership",
            risk_level: "High",
            reason: "Driving Licence expired while owning an active vehicle.",
            recommended_action: "Initiate RTO Licence Renewal immediately.",
            deadline: "2026-08-30"
          }
        ],
        upcoming_expiries: [
          { id: 101, doc_name: "Driving Licence Permit", folder_name: "Vehicle", file_type: "png", expiry_date: "2026-08-30", days_left: 6, urgency_status: "CRITICAL" },
          { id: 102, doc_name: "International Passport Copy", folder_name: "Travel", file_type: "pdf", expiry_date: "2026-09-15", days_left: 22, urgency_status: "CRITICAL" },
          { id: 103, doc_name: "Vehicle PUC Certificate", folder_name: "Vehicle", file_type: "pdf", expiry_date: "2026-10-10", days_left: 47, urgency_status: "WARNING" },
          { id: 104, doc_name: "Health Insurance Policy", folder_name: "Health", file_type: "pdf", expiry_date: "2026-12-31", days_left: 129, urgency_status: "HEALTHY" }
        ],
        documents: [
          { id: 1, name: "Passport_Copy.pdf", file_type: "pdf", folder_name: "Travel", created_at: "2026-08-01T09:15:00Z" },
          { id: 2, name: "Flight_Ticket_NYC.pdf", file_type: "pdf", folder_name: "Travel", created_at: "2026-08-05T11:40:00Z" },
          { id: 3, name: "Driving_Licence.png", file_type: "image", folder_name: "Vehicle", created_at: "2026-07-28T14:20:00Z" },
        ],
        reminders: guestReminders,
        activity: guestActivity,
      });
      return;
    }

    apiClient
      .get<DashboardData>("/api/v1/lifesync/dashboard")
      .then((res) => setData(res))
      .catch(() => setData(null));
  };

  useEffect(() => {
    fetchDashboard();
  }, [guestMode, user]);

  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState<string>("auto");
  const [uploadCustomFolder, setUploadCustomFolder] = useState("");
  const [uploadExpiryDate, setUploadExpiryDate] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setUploadFile(selectedFile);
      const nameWithoutExt = selectedFile.name.split(".").slice(0, -1).join(".");
      setUploadDocName(nameWithoutExt || selectedFile.name);
    }
  };

  const handleRealUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocName.trim()) return;
    setIsUploading(true);
    setUploadFeedback(null);

    let targetFolderId: number | undefined = undefined;
    let targetFolderName: string | undefined = undefined;

    if (uploadFolderId === "new") {
      targetFolderName = uploadCustomFolder.trim();
    } else if (uploadFolderId !== "auto") {
      targetFolderId = Number(uploadFolderId);
    }

    try {
      if (!guestMode && user) {
        if (uploadFile) {
          const formData = new FormData();
          formData.append("file", uploadFile);
          if (targetFolderId) formData.append("folder_id", String(targetFolderId));
          if (targetFolderName) formData.append("folder_name", targetFolderName);
          if (uploadExpiryDate) formData.append("expiry_date", uploadExpiryDate);

          const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

          const response = await fetch(`${API_URL}/api/v1/lifesync/documents/upload`, {
            method: "POST",
            body: formData,
            headers: {
              ...(token ? { "Authorization": `Bearer ${token}` } : {})
            }
          });

          if (!response.ok) throw new Error("Upload failed");
        } else {
          await apiClient.post("/api/v1/lifesync/documents", {
            name: uploadDocName.trim(),
            folder_id: targetFolderId,
            folder_name: targetFolderName,
            expiry_date: uploadExpiryDate || undefined
          });
        }
        fetchDashboard();
      } else {
        const folderName = targetFolderName || (data?.folder_stats?.find(f => f.folder_id === targetFolderId)?.folder_name || "General");
        setData(prev => ({
          ...prev,
          documents: [
            { id: Date.now(), name: uploadDocName.trim(), file_type: uploadFile?.name.split(".").pop() || "pdf", folder_name: folderName, created_at: new Date().toISOString() },
            ...(prev?.documents || [])
          ]
        }));
      }

      setUploadFeedback(`Document '${uploadDocName}' uploaded & indexed successfully!`);
      setUploadDocName("");
      setUploadExpiryDate("");
      setUploadCustomFolder("");
      setUploadFile(null);
      setShowUploadModal(false);
      setTimeout(() => setUploadFeedback(null), 5000);
    } catch {
      setUploadFeedback("Failed to upload document. Please try again.");
      setTimeout(() => setUploadFeedback(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white font-mono">Initializing LifeSync AI Workspace...</div>;
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Quick Document Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-400" /> Quick Document Upload
              </h3>
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="text-zinc-400 hover:text-white rounded-lg p-1 transition-colors text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRealUpload} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Choose File</label>
                <input 
                  type="file"
                  onChange={handleFileChange}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Document Title / Identifier *</label>
                <input 
                  required
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  placeholder="e.g. Passport Copy, Insurance Policy, Tax Return"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Target Folder / Category</label>
                <select
                  value={uploadFolderId}
                  onChange={(e) => setUploadFolderId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="auto">Default / Auto-Assign</option>
                  {data?.folder_stats?.map((f) => (
                    <option key={f.folder_id} value={f.folder_id}>
                      {f.folder_name} ({f.doc_count} files)
                    </option>
                  ))}
                  <option value="new">+ Create Custom Folder...</option>
                </select>
              </div>

              {uploadFolderId === "new" && (
                <div>
                  <label className="text-xs text-indigo-300 block mb-1">New Folder Name *</label>
                  <input
                    required
                    value={uploadCustomFolder}
                    onChange={(e) => setUploadCustomFolder(e.target.value)}
                    placeholder="e.g. Identity Proofs, Health Records"
                    className="w-full bg-zinc-950 border border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Expiry Date (Optional)</label>
                <input 
                  type="date"
                  value={uploadExpiryDate}
                  onChange={(e) => setUploadExpiryDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <Button 
                  type="submit" 
                  disabled={isUploading} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-xs font-semibold"
                >
                  {isUploading ? "Uploading..." : "Upload & Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Feedback Alert */}
      {uploadFeedback && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/40 p-4 text-sm text-indigo-300 flex items-center gap-3 shadow-lg shadow-indigo-950/20">
          <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>{uploadFeedback}</span>
        </div>
      )}
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-primary/40 bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950 p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5" /> AI Executive Command Center
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Welcome back, {user?.first_name || user?.email || "LifeSync User"}.
            </h1>
            <p className="mt-2 text-slate-300 text-sm sm:text-base max-w-2xl">
              Cross-Domain Correlation Engine actively monitoring 7 Smart Folders for upcoming risk signals.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => setShowUploadModal(true)} 
              className="bg-primary hover:bg-blue-600 text-primary-foreground rounded-xl shadow-lg shadow-primary/30 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" /> Quick Document Upload
            </Button>
            <Link href={`/dashboard/assistant${guestMode ? "?guest=1" : ""}`}>
              <Button variant="outline" className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-xl flex items-center gap-2">
                <Bot className="h-4 w-4 text-accent" /> Ask AI Assistant
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Life Health Score</span>
            <Activity className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-3 text-4xl font-extrabold text-white">{data?.health_score || 88}<span className="text-sm font-normal text-zinc-500">/100</span></p>
          <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> High Organizational Readiness
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Risk Alerts</span>
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <p className="mt-3 text-4xl font-extrabold text-white">{data?.active_risks_count || data?.risks?.length || 0}</p>
          <p className="mt-1 text-xs text-red-400 font-medium">Requires Immediate Action</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Folder Completion</span>
            <FolderKanban className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-3 text-4xl font-extrabold text-white">{data?.folder_completion_avg || 79}%</p>
          <p className="mt-1 text-xs text-zinc-400 font-medium">Across 7 Smart Life Folders</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Indexed Docs</span>
            <FileText className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 text-4xl font-extrabold text-white">{data?.documents?.length || 0}</p>
          <p className="mt-1 text-xs text-zinc-400 font-medium">OCR Parsed & Metadata Extracted</p>
        </div>
      </div>

      {/* Cross-Domain Risk Correlation Banner (Core Innovation) */}
      <div className="rounded-3xl border border-red-900/50 bg-gradient-to-br from-red-950/40 via-zinc-950 to-zinc-950 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-red-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cross-Domain Risk Correlation Engine</h2>
              <p className="text-xs text-zinc-400">Inter-folder compound risks identified by AI</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-500/20 text-red-400 border border-red-500/30">
            {data?.risks?.length || 0} Alerts Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.risks || []).map((risk, i) => (
            <div key={i} className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${risk.risk_level === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {risk.risk_level}
                  </span>
                  {risk.deadline && <span className="text-xs font-mono text-zinc-500">Due: {risk.deadline}</span>}
                </div>
                <h3 className="text-sm font-bold text-white mt-2">{risk.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{risk.reason}</p>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 text-xs text-indigo-300 font-medium flex items-center justify-between">
                <span>Action: {risk.recommended_action}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming File Expiries & Renewal Radar */}
      <div className="rounded-3xl border border-amber-900/40 bg-gradient-to-br from-amber-950/20 via-zinc-950 to-zinc-950 p-6 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                <Sparkles className="h-3 w-3 text-amber-400" /> Document Renewal Radar
              </div>
              <h2 className="text-xl font-extrabold text-white">Upcoming File Expiries</h2>
              <p className="text-xs text-zinc-400">Proactive AI countdown tracking for document renewal deadlines</p>
            </div>
          </div>
          <Link href={`/dashboard/folders${guestMode ? "?guest=1" : ""}`}>
            <Button variant="outline" className="border-amber-500/30 bg-amber-950/20 hover:bg-amber-900/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" /> Upload Renewal Copy
            </Button>
          </Link>
        </div>

        {(!data?.upcoming_expiries || data.upcoming_expiries.length === 0) ? (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-white">No Upcoming File Expiries Detected</p>
            <p className="text-xs text-zinc-500">All document expiry dates in your folders are healthy and up-to-date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.upcoming_expiries.map((exp) => {
              let badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
              let badgeText = `${exp.days_left} Days Left`;
              
              if (exp.days_left < 0) {
                badgeColor = "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse";
                badgeText = `Expired (${Math.abs(exp.days_left)}d ago)`;
              } else if (exp.days_left <= 30) {
                badgeColor = "bg-red-500/20 text-red-400 border-red-500/30";
                badgeText = `${exp.days_left} Days Left`;
              } else if (exp.days_left <= 90) {
                badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/30";
                badgeText = `${exp.days_left} Days Left`;
              }

              return (
                <div key={exp.id} className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3 shadow-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-mono uppercase border border-zinc-700">
                        {exp.folder_name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${badgeColor}`}>
                        {badgeText}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white truncate" title={exp.doc_name}>{exp.doc_name}</h3>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-zinc-500" /> Expiry Date:
                      </span>
                      <span className="font-mono text-zinc-200 font-semibold">{exp.expiry_date}</span>
                    </div>

                    <Link href={`/dashboard/document/${exp.id}`} className="block">
                      <Button variant="ghost" className="w-full h-8 text-[11px] font-semibold text-accent hover:text-teal-300 hover:bg-teal-950/30 rounded-xl flex items-center justify-between px-2">
                        <span>View Document Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Smart Life Folders Summary */}
      <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Smart Life Folders</h2>
            <p className="text-xs text-zinc-400">Automatic categorization and completeness tracking</p>
          </div>
          <Link href={`/dashboard/folders${guestMode ? "?guest=1" : ""}`}>
            <Button variant="ghost" className="text-xs text-indigo-400 hover:text-indigo-300">View All Folders & Graphs →</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(data?.folder_stats || []).map((f) => (
            <Link 
              key={f.folder_id} 
              href={`/dashboard/folders?folder_id=${f.folder_id}${guestMode ? "&guest=1" : ""}`}
              className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-all hover:bg-zinc-900/60 block space-y-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white hover:text-indigo-400 transition-colors">{f.folder_name}</span>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{f.doc_count} files</span>
              </div>
              
              <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                <span>View Uploaded Files</span>
                <ArrowRight className="h-3 w-3 text-indigo-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm p-4">Loading Life Command Center...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
