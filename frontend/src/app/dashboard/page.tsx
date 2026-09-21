"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth/auth-context";
import { guestReminders, guestActivity } from "@/lib/guest-sample";
import { 
  Activity, FileText, ShieldAlert, Sparkles, FolderKanban, 
  ArrowRight, Upload, AlertTriangle, CheckCircle2, Bot, 
  Clock, Calendar, Zap, Layers, Lock, ShieldCheck, ChevronRight,
  TrendingUp, FileCheck, AlertCircle, Plus
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
  const { user, status } = useAuth();
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

          await apiClient.post("/api/v1/lifesync/documents/upload", formData);
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

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="font-mono text-sm text-zinc-400">Initializing LifeSync AI Workspace...</p>
      </div>
    );
  }

  const healthScore = data?.health_score || 88;
  const activeRisks = data?.risks || [];
  const completionAvg = data?.folder_completion_avg || 79;
  const docCount = data?.documents?.length || 0;

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto pb-12">
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Upload className="h-5 w-5" />
                </div>
                Quick Document Upload
              </h3>
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="text-zinc-500 hover:text-white rounded-lg p-1.5 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRealUpload} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">Choose File</label>
                <input 
                  type="file"
                  onChange={handleFileChange}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">Document Title *</label>
                <input 
                  required
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  placeholder="e.g. Passport Copy, Insurance Policy, Tax Return"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">Target Folder / Category</label>
                <select
                  value={uploadFolderId}
                  onChange={(e) => setUploadFolderId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="auto">Default / Auto-Assign by AI OCR</option>
                  {data?.folder_stats?.map((f) => (
                    <option key={f.folder_id} value={f.folder_id}>
                      {f.folder_name} ({f.doc_count} files)
                    </option>
                  ))}
                  <option value="new">+ Create Custom Folder...</option>
                </select>
              </div>

              {uploadFolderId === "new" && (
                <div className="animate-in fade-in duration-150">
                  <label className="text-xs font-medium text-indigo-300 block mb-1.5">New Folder Name *</label>
                  <input
                    required
                    value={uploadCustomFolder}
                    onChange={(e) => setUploadCustomFolder(e.target.value)}
                    placeholder="e.g. Identity Proofs, Health Records"
                    className="w-full bg-zinc-900 border border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">Expiry Date (Optional)</label>
                <input 
                  type="date"
                  value={uploadExpiryDate}
                  onChange={(e) => setUploadExpiryDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <Button 
                  type="submit" 
                  disabled={isUploading} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  {isUploading ? "Processing OCR..." : "Upload & Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Notification Banner */}
      {uploadFeedback && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-300 flex items-center gap-3 shadow-xl backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{uploadFeedback}</span>
        </div>
      )}

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-r from-zinc-950 via-indigo-950/30 to-purple-950/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              CORE CORRELATION ENGINE ACTIVE
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Command Center — <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-white bg-clip-text text-transparent">{user?.full_name || user?.email?.split('@')[0] || "LifeSync User"}</span>
            </h1>
            
            <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
              Real-time multi-folder vulnerability tracking, document OCR attribute extraction, and automated renewal countdowns.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 shrink-0">
            <Button 
              onClick={() => setShowUploadModal(true)} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-5 py-3 font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Upload className="h-4 w-4" /> Quick Upload
            </Button>
            <Link href={`/dashboard/assistant${guestMode ? "?guest=1" : ""}`}>
              <Button variant="outline" className="border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 rounded-2xl px-5 py-3 font-semibold flex items-center gap-2 backdrop-blur-md transition-all hover:scale-[1.02]">
                <Bot className="h-4 w-4 text-purple-400" /> Ask AI Assistant
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── METRICS GRID ─────────────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Health Score Card */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl hover:border-indigo-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Life Health Score</span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tight">{healthScore}</span>
            <span className="text-xs font-medium text-zinc-500">/ 100</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>High Organizational Readiness</span>
          </div>
        </div>

        {/* Active Risk Alerts Card */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl hover:border-red-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Active Risk Alerts</span>
            <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 group-hover:scale-110 transition-transform">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tight">{activeRisks.length}</span>
            <span className="text-xs font-medium text-red-400/80">detected</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{activeRisks.length > 0 ? "Action Required" : "No Critical Vulnerabilities"}</span>
          </div>
        </div>

        {/* Folder Completeness Card */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl hover:border-cyan-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Folder Completeness</span>
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tight">{completionAvg}%</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span>Across 7 Smart Life Folders</span>
          </div>
        </div>

        {/* Total Indexed Documents Card */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl hover:border-purple-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">Indexed Documents</span>
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tight">{docCount}</span>
            <span className="text-xs font-medium text-zinc-500">records</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-purple-400">
            <FileCheck className="h-3.5 w-3.5" />
            <span>OCR & Attribute Indexed</span>
          </div>
        </div>
      </div>

      {/* ── CROSS-DOMAIN RISK CORRELATION ENGINE ───────────────────────────── */}
      <div className="rounded-3xl border border-red-950/60 bg-gradient-to-br from-red-950/20 via-zinc-950 to-zinc-950 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-950/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-500/15 text-red-400 border border-red-500/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[11px] font-mono font-bold uppercase tracking-wider mb-1 border border-red-500/20">
                <Zap className="h-3 w-3" /> Core Innovation Engine
              </div>
              <h2 className="text-xl font-extrabold text-white">Cross-Domain Risk Correlation Engine</h2>
              <p className="text-xs text-zinc-400">AI correlates documents across life folders to uncover hidden compliance & travel risks</p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
            {activeRisks.length} Risk Signals
          </span>
        </div>

        {activeRisks.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl space-y-2">
            <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-white">No Cross-Domain Risks Detected</p>
            <p className="text-xs text-zinc-500">Your documents across Travel, Health, Vehicle, and Finance folders are fully aligned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeRisks.map((risk, i) => (
              <div key={i} className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 hover:border-red-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border ${
                      risk.risk_level === 'Critical' 
                        ? 'bg-red-500/20 text-red-400 border-red-500/40' 
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}>
                      {risk.risk_level} Risk
                    </span>
                    {risk.deadline && (
                      <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
                        Deadline: {risk.deadline}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-red-300 transition-colors">{risk.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{risk.reason}</p>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-indigo-300 font-medium">Recommended Action: {risk.recommended_action}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-indigo-400 shrink-0 ml-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DOCUMENT RENEWAL RADAR ─────────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider mb-1 border border-amber-500/20">
                <Sparkles className="h-3 w-3 text-amber-400" /> RENEWAL RADAR
              </div>
              <h2 className="text-xl font-extrabold text-white">Upcoming Document Expiries</h2>
              <p className="text-xs text-zinc-400">Automated deadline tracking for licences, passports, insurance policies, and certificates</p>
            </div>
          </div>
          <Link href={`/dashboard/folders${guestMode ? "?guest=1" : ""}`}>
            <Button variant="outline" className="border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2">
              View All Expiries <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {(!data?.upcoming_expiries || data.upcoming_expiries.length === 0) ? (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-white">No Upcoming File Expiries Detected</p>
            <p className="text-xs text-zinc-500">All document expiry dates in your folders are up-to-date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.upcoming_expiries.map((exp) => {
              let badgeColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
              let badgeText = `${exp.days_left} Days Left`;
              
              if (exp.days_left < 0) {
                badgeColor = "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse";
                badgeText = `Expired (${Math.abs(exp.days_left)}d ago)`;
              } else if (exp.days_left <= 30) {
                badgeColor = "bg-red-500/20 text-red-400 border-red-500/40";
                badgeText = `${exp.days_left} Days Left`;
              } else if (exp.days_left <= 90) {
                badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/40";
                badgeText = `${exp.days_left} Days Left`;
              }

              return (
                <div key={exp.id} className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 shadow-lg group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-zinc-900 text-zinc-400 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border border-zinc-800">
                        {exp.folder_name}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${badgeColor}`}>
                        {badgeText}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate" title={exp.doc_name}>
                      {exp.doc_name}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span>Expiry:</span>
                      <span className="text-zinc-200 font-semibold">{exp.expiry_date}</span>
                    </div>

                    <Link href={`/dashboard/document/${exp.id}`} className="block">
                      <Button variant="ghost" className="w-full h-8 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 rounded-xl flex items-center justify-between px-2">
                        <span>Details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SMART LIFE FOLDERS GRID ────────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-6 sm:p-8 space-y-6 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-white">7 Smart Life Folders</h2>
            <p className="text-xs text-zinc-400">Automatic document indexing across core life administration domains</p>
          </div>
          <Link href={`/dashboard/folders${guestMode ? "?guest=1" : ""}`}>
            <Button variant="ghost" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold">
              Manage Folders <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(data?.folder_stats || []).map((f) => (
            <Link 
              key={f.folder_id} 
              href={`/dashboard/folders?folder_id=${f.folder_id}${guestMode ? "&guest=1" : ""}`}
              className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 hover:border-indigo-500/40 transition-all hover:bg-zinc-900/80 block space-y-4 cursor-pointer group shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{f.folder_name}</span>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-0.5 rounded-md border border-zinc-800">{f.doc_count} files</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>Completeness</span>
                  <span className="font-bold text-zinc-200">{f.completion_pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" 
                    style={{ width: `${f.completion_pct}%` }} 
                  />
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1 border-t border-zinc-900">
                <span>View Documents</span>
                <ChevronRight className="h-3.5 w-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
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
    <Suspense fallback={<div className="text-zinc-400 text-sm p-6">Loading Executive Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
