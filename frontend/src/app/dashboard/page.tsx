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
  TrendingUp, FileCheck, AlertCircle, Plus, Bell, Send, Trash2
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
  reminders?: Array<{ id: number; title: string; message: string | null; trigger_time: string | null; is_sent?: boolean }>;
  activity?: Array<{ id: number; action: string; details: string | null; created_at: string | null }>;
}

const EXPIRY_REMINDER_WINDOW_DAYS = 10;


function DashboardContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";
  const { user, status } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const expiringSoon = (data?.upcoming_expiries || []).filter(
    (expiry) => expiry.days_left >= 0 && expiry.days_left <= EXPIRY_REMINDER_WINDOW_DAYS,
  );

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
          { id: 101, doc_name: "Driving Licence Permit", folder_name: "Vehicle", file_type: "png", expiry_date: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), days_left: 6, urgency_status: "CRITICAL" },
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

  // Scheduled Reminders States & Handlers
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim() || !reminderTime) return;
    setCreatingReminder(true);
    try {
      if (!guestMode && user) {
        await apiClient.post("/api/v1/lifesync/reminders", {
          title: reminderTitle.trim(),
          message: reminderMessage.trim() || undefined,
          trigger_time: new Date(reminderTime).toISOString(),
        });
        fetchDashboard();
      } else {
        const newRem = {
          id: Date.now(),
          title: reminderTitle.trim(),
          message: reminderMessage.trim() || null,
          trigger_time: reminderTime,
          is_sent: false,
        };
        setData((prev) => prev ? { ...prev, reminders: [newRem, ...(prev.reminders || [])] } : null);
      }
      setShowReminderModal(false);
      setReminderTitle("");
      setReminderMessage("");
      setReminderTime("");
      setReminderFeedback("Reminder scheduled successfully!");
      setTimeout(() => setReminderFeedback(null), 3500);
    } catch {
      setReminderFeedback("Failed to schedule reminder.");
    } finally {
      setCreatingReminder(false);
    }
  };

  const handleSendReminderNow = async (id: number) => {
    try {
      if (!guestMode && user) {
        await apiClient.post(`/api/v1/lifesync/reminders/${id}/send-now`, {});
        fetchDashboard();
      } else {
        setData((prev) => prev ? {
          ...prev,
          reminders: (prev.reminders || []).map((r) => r.id === id ? { ...r, is_sent: true } : r)
        } : null);
      }
      setReminderFeedback("Reminder alert email dispatched!");
      setTimeout(() => setReminderFeedback(null), 3500);
    } catch {
      setReminderFeedback("Failed to send reminder email.");
    }
  };

  const handleDeleteReminder = async (id: number) => {
    try {
      if (!guestMode && user) {
        await apiClient.delete(`/api/v1/lifesync/reminders/${id}`);
        fetchDashboard();
      } else {
        setData((prev) => prev ? {
          ...prev,
          reminders: (prev.reminders || []).filter((r) => r.id !== id)
        } : null);
      }
    } catch {
      setReminderFeedback("Failed to delete reminder.");
    }
  };


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
      let assignedFolder = "";
      if (!guestMode && user) {
        if (uploadFile) {
          const formData = new FormData();
          formData.append("file", uploadFile);
          formData.append("name", uploadDocName.trim());
          if (targetFolderId) formData.append("folder_id", String(targetFolderId));
          if (targetFolderName) formData.append("folder_name", targetFolderName);
          if (uploadExpiryDate) formData.append("expiry_date", uploadExpiryDate);

          const res = await apiClient.post<{ folder_name?: string; message?: string }>("/api/v1/lifesync/documents/upload", formData);
          assignedFolder = res.folder_name || "";
        } else {
          const res = await apiClient.post<{ folder_name?: string; message?: string }>("/api/v1/lifesync/documents", {
            name: uploadDocName.trim(),
            folder_id: targetFolderId,
            folder_name: targetFolderName,
            expiry_date: uploadExpiryDate || undefined
          });
          assignedFolder = res.folder_name || "";
        }
        fetchDashboard();
      } else {
        const folderName = targetFolderName || (data?.folder_stats?.find(f => f.folder_id === targetFolderId)?.folder_name || "General");
        assignedFolder = folderName;
        setData(prev => ({
          ...prev,
          documents: [
            { id: Date.now(), name: uploadDocName.trim(), file_type: uploadFile?.name.split(".").pop() || "pdf", folder_name: folderName, created_at: new Date().toISOString() },
            ...(prev?.documents || [])
          ]
        }));
      }

      setUploadFeedback(`Document '${uploadDocName}' successfully analyzed & filed in folder: '${assignedFolder || 'General'}'`);
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        <p className="font-mono text-sm text-slate-600">Initializing LifeSync AI Workspace...</p>
      </div>
    );
  }

  const healthScore = data?.health_score ?? 0;
  const activeRisks = data?.risks || [];
  const completionAvg = data?.folder_completion_avg ?? 0;
  const docCount = data?.documents?.length || 0;
  const hasDocuments = docCount > 0;

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto pb-12">
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-700 border border-teal-500/30">
                  <Upload className="h-5 w-5" />
                </div>
                Quick Document Upload
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-500 hover:text-slate-900 rounded-lg p-1.5 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRealUpload} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Choose File</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-teal-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Document Title *</label>
                <input
                  required
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  placeholder="e.g. Passport Copy, Insurance Policy, Tax Return"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Target Folder / Category</label>
                <select
                  value={uploadFolderId}
                  onChange={(e) => setUploadFolderId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-500 cursor-pointer"
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
                  <label className="text-xs font-medium text-teal-700 block mb-1.5">New Folder Name *</label>
                  <input
                    required
                    value={uploadCustomFolder}
                    onChange={(e) => setUploadCustomFolder(e.target.value)}
                    placeholder="e.g. Identity Proofs, Health Records"
                    className="w-full bg-white border border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={uploadExpiryDate}
                  onChange={(e) => setUploadExpiryDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="bg-teal-700 hover:bg-teal-600 text-white rounded-xl px-5 py-2.5 text-xs font-semibold shadow-lg shadow-teal-600/20"
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
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/40 p-4 text-sm text-emerald-700 flex items-center gap-3 shadow-xl backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
          <span className="font-medium">{uploadFeedback}</span>
        </div>
      )}

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-teal-50/30 to-cyan-50/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-700 text-xs font-mono font-bold tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              CORE CORRELATION ENGINE ACTIVE
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Command Center — <span className="bg-gradient-to-r from-teal-700 via-cyan-700 to-slate-700 bg-clip-text text-transparent">{user?.full_name || user?.email?.split('@')[0] || "LifeSync User"}</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed">
              Real-time multi-folder vulnerability tracking, document OCR attribute extraction, and automated renewal countdowns.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-teal-700 hover:bg-teal-600 text-white rounded-2xl px-5 py-3 font-semibold shadow-lg shadow-teal-600/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Upload className="h-4 w-4" /> Quick Upload
            </Button>
            <Link href={`/dashboard/assistant${guestMode ? "?guest=1" : ""}`}>
              <Button variant="outline" className="border-slate-300 bg-white/90 hover:bg-slate-100 text-slate-800 rounded-2xl px-5 py-3 font-semibold flex items-center gap-2 backdrop-blur-md transition-all hover:scale-[1.02]">
                <Bot className="h-4 w-4 text-cyan-700" /> Ask AI Assistant
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── METRICS GRID ─────────────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Health Score Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/60 p-6 backdrop-blur-xl shadow-xl hover:border-teal-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">Life Health Score</span>
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-700 border border-teal-500/20 group-hover:scale-110 transition-transform">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 tracking-tight">{hasDocuments ? healthScore : "—"}</span>
            {hasDocuments && <span className="text-xs font-medium text-slate-500">/ 100</span>}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            {hasDocuments ? <CheckCircle2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            <span>{!data ? "Dashboard data unavailable" : hasDocuments ? "Based on your uploaded documents" : "Upload documents to calculate"}</span>
          </div>
        </div>

        {/* Active Risk Alerts Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/60 p-6 backdrop-blur-xl shadow-xl hover:border-red-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">Active Risk Alerts</span>
            <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-700 border border-red-500/20 group-hover:scale-110 transition-transform">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 tracking-tight">{activeRisks.length}</span>
            <span className="text-xs font-medium text-red-700/80">detected</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{activeRisks.length > 0 ? "Action Required" : "No Critical Vulnerabilities"}</span>
          </div>
        </div>

        {/* Folder Completeness Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/60 p-6 backdrop-blur-xl shadow-xl hover:border-cyan-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">Folder Completeness</span>
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-700 border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 tracking-tight">{hasDocuments ? `${completionAvg}%` : "—"}</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Layers className="h-3.5 w-3.5 text-cyan-700" />
            <span>{!data ? "Dashboard data unavailable" : hasDocuments ? "Across your Smart Life Folders" : "Upload documents to calculate"}</span>
          </div>
        </div>

        {/* Total Indexed Documents Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/60 p-6 backdrop-blur-xl shadow-xl hover:border-cyan-500/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">Indexed Documents</span>
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-700 border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 tracking-tight">{docCount}</span>
            <span className="text-xs font-medium text-slate-500">records</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-cyan-700">
            <FileCheck className="h-3.5 w-3.5" />
            <span>OCR & Attribute Indexed</span>
          </div>
        </div>
      </div>

      {/* ── CROSS-DOMAIN RISK CORRELATION ENGINE ───────────────────────────── */}
      <div className="rounded-3xl border border-red-200/60 bg-gradient-to-br from-red-50/20 via-slate-50 to-slate-50 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-200/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 border border-red-500/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-700 text-[11px] font-mono font-bold uppercase tracking-wider mb-1 border border-red-500/20">
                <Zap className="h-3 w-3" /> Core Innovation Engine
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Cross-Domain Risk Correlation Engine</h2>
              <p className="text-xs text-slate-600">AI correlates documents across life folders to uncover hidden compliance & travel risks</p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-red-500/15 text-red-700 border border-red-500/30 shrink-0">
            {activeRisks.length} Risk Signals
          </span>
        </div>

        {activeRisks.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
            <ShieldCheck className="h-8 w-8 text-emerald-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-900">No Cross-Domain Risks Detected</p>
            <p className="text-xs text-slate-500">Your documents across Travel, Health, Vehicle, and Finance folders are fully aligned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeRisks.map((risk, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/90 border border-slate-200/90 hover:border-red-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border ${
                      risk.risk_level === 'Critical'
                        ? 'bg-red-500/20 text-red-700 border-red-500/40'
                        : 'bg-amber-500/20 text-amber-700 border-amber-500/40'
                    }`}>
                      {risk.risk_level} Risk
                    </span>
                    {risk.deadline && (
                      <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                        Deadline: {risk.deadline}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors">{risk.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{risk.reason}</p>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-teal-700 font-medium">Recommended Action: {risk.recommended_action}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-teal-700 shrink-0 ml-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DOCUMENT RENEWAL RADAR ─────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/60 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[11px] font-mono font-bold uppercase tracking-wider mb-1 border border-amber-500/20">
                <Sparkles className="h-3 w-3 text-amber-700" /> RENEWAL RADAR
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Documents Expiring in the Next 10 Days</h2>
              <p className="text-xs text-slate-600">A reminder for documents due within the next {EXPIRY_REMINDER_WINDOW_DAYS} days</p>
            </div>
          </div>
          <Link href={`/dashboard/folders${guestMode ? "?guest=1" : ""}`}>
            <Button variant="outline" className="border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2">
              View All Expiries <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {expiringSoon.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-900">No Documents Expiring Soon</p>
            <p className="text-xs text-slate-500">You have no documents expiring in the next {EXPIRY_REMINDER_WINDOW_DAYS} days.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {expiringSoon.map((exp) => {
              const badgeColor = "bg-amber-500/20 text-amber-800 border-amber-500/40";
              const badgeText = exp.days_left === 0 ? "Expires today" : `${exp.days_left} ${exp.days_left === 1 ? "day" : "days"} left`;

              return (
                <div key={exp.id} className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-lg group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-white text-slate-600 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border border-slate-200">
                        {exp.folder_name}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${badgeColor}`}>
                        {badgeText}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate" title={exp.doc_name}>
                      {exp.doc_name}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                      <span>Expires on:</span>
                      <span className="text-slate-800 font-semibold">{exp.expiry_date}</span>
                    </div>

                    <Link href={`/dashboard/document/${exp.id}`} className="block">
                      <Button variant="ghost" className="w-full h-8 text-xs font-semibold text-teal-700 hover:text-teal-700 hover:bg-teal-50/30 rounded-xl flex items-center justify-between px-2">
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
      <div className="rounded-3xl border border-slate-200/80 bg-white/60 p-6 sm:p-8 space-y-6 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">7 Smart Life Folders</h2>
            <p className="text-xs text-slate-600">Automatic document indexing across core life administration domains</p>
          </div>
          <Link href={`/dashboard/folders${guestMode ? "?guest=1" : ""}`}>
            <Button variant="ghost" className="text-xs text-teal-700 hover:text-teal-700 flex items-center gap-1 font-semibold">
              Manage Folders <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(data?.folder_stats || []).map((f) => (
            <Link
              key={f.folder_id}
              href={`/dashboard/folders?folder_id=${f.folder_id}${guestMode ? "&guest=1" : ""}`}
              className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-teal-500/40 transition-all hover:bg-white/80 block space-y-4 cursor-pointer group shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{f.folder_name}</span>
                <span className="text-xs font-mono text-slate-600 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">{f.doc_count} files</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <span>Completeness</span>
                  <span className="font-bold text-slate-800">{f.completion_pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${f.completion_pct}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                <span>View Documents</span>
                <ChevronRight className="h-3.5 w-3.5 text-teal-700 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── SCHEDULED REMINDERS & ALERTS SECTION ───────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/60 p-6 sm:p-8 space-y-6 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-500/10 border border-teal-500/20 p-2.5 text-teal-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Scheduled Reminders & Due Alerts</h2>
              <p className="text-xs text-slate-600">Proactive notifications dispatched before document and passport expirations</p>
            </div>
          </div>
          <Button
            onClick={() => setShowReminderModal(true)}
            className="bg-teal-700 hover:bg-teal-600 text-white rounded-2xl px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-600/20 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> New Reminder
          </Button>
        </div>

        {reminderFeedback && (
          <div className="p-3 rounded-xl border border-teal-500/30 bg-teal-50/40 text-teal-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
            <span>{reminderFeedback}</span>
          </div>
        )}

        {(!data?.reminders || data.reminders.length === 0) ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl space-y-3">
            <Clock className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-900">No Scheduled Reminders</p>
            <p className="text-xs text-slate-500">Create scheduled reminders to receive automated email alerts before renewals.</p>
            <Button
              onClick={() => setShowReminderModal(true)}
              variant="outline"
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
            >
              + Create First Reminder
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.reminders.map((r) => {
              const triggerDate = r.trigger_time ? new Date(r.trigger_time) : null;
              const formattedDate = triggerDate ? triggerDate.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Unscheduled";
              const isPast = triggerDate ? triggerDate.getTime() < Date.now() : false;

              return (
                <div key={r.id} className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-4 shadow-lg group hover:border-slate-300 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${
                        r.is_sent
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                          : isPast
                          ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                          : "bg-teal-500/15 text-teal-700 border-teal-500/30"
                      }`}>
                        {r.is_sent ? "Dispatched" : isPast ? "Due" : "Scheduled"}
                      </span>

                      <button
                        onClick={() => handleDeleteReminder(r.id)}
                        className="text-slate-500 hover:text-rose-700 p-1 rounded-lg transition-colors"
                        title="Delete Reminder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {r.title}
                    </h3>
                    {r.message && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {r.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{formattedDate}</span>
                    </div>

                    <Button
                      onClick={() => handleSendReminderNow(r.id)}
                      variant="ghost"
                      className="h-7 text-[11px] text-teal-700 hover:text-teal-700 hover:bg-teal-50/40 rounded-lg px-2 flex items-center gap-1"
                      title="Send Email Alert Now"
                    >
                      <Send className="h-3 w-3" />
                      <span>Alert Now</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CREATE REMINDER MODAL ────────────────────────────────────────── */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-teal-700" /> Schedule Reminder
              </h3>
              <button
                onClick={() => setShowReminderModal(false)}
                className="text-slate-500 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Renew International Passport"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Message (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Check Passport Seva appointment dates online"
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Trigger Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-500 [color-scheme:dark]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowReminderModal(false)}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingReminder}
                  className="bg-teal-700 hover:bg-teal-600 text-white rounded-xl px-5 py-2 text-xs font-bold shadow-lg shadow-teal-600/20"
                >
                  {creatingReminder ? "Scheduling..." : "Save Reminder"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-slate-600 text-sm p-6">Loading Executive Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
