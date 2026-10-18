"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { guestReportSample } from "@/lib/guest-sample";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Printer,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Heart,
  Trash2,
  FileText,
  CheckCircle2
} from "lucide-react";

interface HealthReport {
  id: number;
  report_type: string;
  created_at: string;
  cautions?: string;
  remedies?: string;
  raw_content?: string;
  manual_data?: {
    age: number;
    gender: string;
    symptoms: string;
    medical_history?: string;
    lifestyle_factors?: string;
  };
}

// Simple parser to turn basic markdown list text (* or -) into clean styled elements
function formatMarkdown(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  return (
    <ul className="space-y-4">
      {lines.map((line, idx) => {
        let cleanLine = line.trim();

        // Handle callout blocks
        if (cleanLine.startsWith("> [!NOTE]")) {
          return null; // Skip markdown block banner line
        }
        if (cleanLine.startsWith(">") || cleanLine.startsWith("*Using Rule-Based")) {
          return (
            <div key={idx} className="bg-slate-100 print:bg-slate-100 border border-slate-300/60 print:border-slate-300 p-3 rounded-xl text-slate-700 print:text-slate-700 text-xs italic mb-4">
              {cleanLine.replace(/^>\s*/, "")}
            </div>
          );
        }

        if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
          cleanLine = cleanLine.substring(1).trim();

          // Bold parse
          const boldParts = cleanLine.split("**");
          return (
            <li key={idx} className="flex gap-2 text-slate-700 print:text-slate-800 text-sm sm:text-base leading-relaxed">
              <span className="text-teal-700 print:text-teal-700 mt-1.5 shrink-0">•</span>
              <span>
                {boldParts.map((part, pIdx) =>
                  pIdx % 2 === 1 ? <strong key={pIdx} className="text-slate-900 print:text-slate-950 font-semibold">{part}</strong> : part
                )}
              </span>
            </li>
          );
        }

        if (!cleanLine) return null;

        // Default text line
        const boldParts = cleanLine.split("**");
        return (
          <p key={idx} className="text-slate-700 print:text-slate-800 text-sm sm:text-base leading-relaxed">
            {boldParts.map((part, pIdx) =>
              pIdx % 2 === 1 ? <strong key={pIdx} className="text-slate-900 print:text-slate-950 font-semibold">{part}</strong> : part
            )}
          </p>
        );
      })}
    </ul>
  );
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const reportId = resolvedParams.id;
  const router = useRouter();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  useEffect(() => {
    if (guestMode) {
      setReport(guestReportSample);
      setLoading(false);
      return;
    }

    if (reportId) {
      apiClient.get<HealthReport>(`/api/v1/health/report/${reportId}`)
        .then((data) => {
          setReport(data);
        })
        .catch((err) => {
          if (err instanceof ApiError) {
            setError(err.data?.detail || "Failed to load report details");
          } else {
            setError("Unable to find the requested report");
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [reportId, guestMode]);

  const handleDeleteReport = async () => {
    if (guestMode) {
      router.push("/dashboard?guest=1");
      return;
    }
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/v1/health/report/${reportId}`);
      router.push("/dashboard");
    } catch {
      setError("Failed to delete health report.");
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-10 w-10 animate-spin text-teal-700" />
          <p className="text-slate-600 font-medium">Extracting predictive cautions...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-900 px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <ShieldAlert className="h-16 w-16 text-rose-700 mx-auto" />
          <h2 className="text-2xl font-bold">Report Unobtainable</h2>
          <p className="text-slate-600">{error || "The requested assessment data is unavailable."}</p>
          <Link href={`/dashboard${guestMode ? "?guest=1" : ""}`}>
            <Button className="w-full bg-teal-700 hover:bg-teal-600 mt-4">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 font-sans print:bg-white print:text-slate-950 print:py-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 print:px-0 print:max-w-none">

        {/* Printable Formal Header (visible only when printing / exporting to PDF) */}
        <div className="hidden print:block border-b-2 border-slate-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-teal-700" />
                <h1 className="text-2xl font-black tracking-tight text-slate-900">LifeSync AI Health Diagnostics</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">Autonomous Clinical Prevention & Longitudinal Health Intelligence</p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p><strong>Report Reference:</strong> #LS-HLTH-{report.id}</p>
              <p><strong>Assessment Date:</strong> {new Date(report.created_at).toLocaleDateString()}</p>
              <p><strong>Status:</strong> AI Diagnostic Verified</p>
            </div>
          </div>
        </div>

        {/* Back Link & Action Bar */}
        <div className="flex items-center justify-between print:hidden">
          <Link href={`/dashboard${guestMode ? "?guest=1" : ""}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-2 rounded-xl text-xs"
            >
              <Printer className="h-4 w-4" /> Export PDF / Print
            </Button>

            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="outline"
              className="border-red-200/50 hover:bg-red-50/40 text-red-700 hover:text-red-700 flex items-center gap-2 rounded-xl text-xs"
            >
              <Trash2 className="h-4 w-4" /> Delete Report
            </Button>
          </div>
        </div>

        {/* Report Overview Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white print:bg-white print:border-slate-300 border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                report.report_type === "file"
                  ? "bg-cyan-500/10 text-cyan-700 ring-cyan-400/20 print:text-cyan-800"
                  : "bg-teal-500/10 text-teal-700 ring-teal-400/20 print:text-teal-800"
              }`}>
                {report.report_type === "file" ? "Medical Document Analysis" : "Manual Self-Assessment"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 print:text-slate-900">Health Diagnostics & Predicted Cautions</h1>
            </div>

            <div className="flex items-center gap-2 text-slate-600 print:text-slate-600 text-sm shrink-0">
              <Clock className="h-4 w-4" />
              <span>{new Date(report.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* User Details Subcard */}
          <div className="border-t border-slate-200 print:border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-600 print:text-slate-600 uppercase tracking-wider mb-3">Diagnostic Context</h3>

            {report.report_type === "manual" && report.manual_data ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-slate-50 print:bg-slate-50 p-4 rounded-xl border border-slate-200/80 print:border-slate-200">
                <div>
                  <span className="text-slate-500">Age / Gender:</span>
                  <p className="font-semibold text-slate-800 print:text-slate-900 mt-0.5 capitalize">{report.manual_data.age} / {report.manual_data.gender}</p>
                </div>
                <div>
                  <span className="text-slate-500">Primary Symptoms:</span>
                  <p className="font-semibold text-slate-800 print:text-slate-900 mt-0.5 capitalize line-clamp-2">{report.manual_data.symptoms}</p>
                </div>
                <div>
                  <span className="text-slate-500">History & Lifestyle:</span>
                  <p className="font-semibold text-slate-800 print:text-slate-900 mt-0.5 line-clamp-2">
                    {[report.manual_data.medical_history, report.manual_data.lifestyle_factors].filter(Boolean).join(" | ") || "None specified"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 print:bg-slate-50 p-4 rounded-xl border border-slate-200/80 print:border-slate-200 text-sm">
                <span className="text-slate-500">Extracted Raw Text Snippet:</span>
                <p className="text-slate-700 print:text-slate-800 mt-1 font-mono text-xs line-clamp-4 overflow-y-auto max-h-24 whitespace-pre-wrap">
                  {report.raw_content || "Processing completed. Text extracted successfully."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Predictions & Cautions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Cautions Panel */}
          <div className="bg-white print:bg-white print:border-slate-300 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-bold text-rose-700 print:text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" /> Predicted Cautions & Risks
            </h2>
            <div className="space-y-4">
              {report.cautions ? formatMarkdown(report.cautions) : (
                <p className="text-slate-600 print:text-slate-600 text-sm">No specific health alerts generated.</p>
              )}
            </div>
          </div>

          {/* Remedies Panel */}
          <div className="bg-white print:bg-white print:border-slate-300 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-bold text-emerald-700 print:text-emerald-700 flex items-center gap-2">
              <Heart className="h-5 w-5 shrink-0" /> Remedial Correctives & Actions
            </h2>
            <div className="space-y-4">
              {report.remedies ? formatMarkdown(report.remedies) : (
                <p className="text-slate-600 print:text-slate-600 text-sm">No specific corrective measures generated.</p>
              )}
            </div>
          </div>

        </div>

        {/* Clinical Notes / Doctor Stamp Space for Print */}
        <div className="hidden print:block border-t border-slate-300 pt-6 mt-8">
          <div className="grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <p className="font-bold text-slate-800">Physician / Reviewing Practitioner:</p>
              <div className="mt-8 border-b border-slate-400 w-48"></div>
              <p className="mt-1">Signature & Stamp</p>
            </div>
            <div>
              <p className="font-bold text-slate-800">Action Plan / Follow-up Notes:</p>
              <div className="mt-8 border-b border-slate-400 w-full"></div>
            </div>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div className="rounded-2xl border border-slate-200 print:border-slate-300 bg-white/50 print:bg-slate-50 p-4 text-xs text-slate-500 print:text-slate-600 leading-relaxed text-center">
          <strong>Disclaimer:</strong> This application is powered by heuristics and AI model predictions for education and preventative guidelines. It is not an alternative to licensed clinical diagnostics. Always seek the advice of your general practitioner or physician.
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-700">
              <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Health Report</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete this health diagnostic report? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="text-xs h-9 border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteReport}
                disabled={isDeleting}
                className="text-xs h-9 bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
