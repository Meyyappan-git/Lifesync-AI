"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
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
  CheckSquare, 
  Clock, 
  Heart 
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
            <div key={idx} className="bg-zinc-800 border border-zinc-700/60 p-3 rounded-xl text-zinc-300 text-xs italic mb-4">
              {cleanLine.replace(/^>\s*/, "")}
            </div>
          );
        }

        if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
          cleanLine = cleanLine.substring(1).trim();
          
          // Bold parse
          const boldParts = cleanLine.split("**");
          return (
            <li key={idx} className="flex gap-2 text-zinc-300 text-sm sm:text-base leading-relaxed">
              <span className="text-indigo-400 mt-1.5 shrink-0">•</span>
              <span>
                {boldParts.map((part, pIdx) => 
                  pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-semibold">{part}</strong> : part
                )}
              </span>
            </li>
          );
        }
        
        if (!cleanLine) return null;
        
        // Default text line
        const boldParts = cleanLine.split("**");
        return (
          <p key={idx} className="text-zinc-300 text-sm sm:text-base leading-relaxed">
            {boldParts.map((part, pIdx) => 
              pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-semibold">{part}</strong> : part
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
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-zinc-400 font-medium">Extracting predictive cautions...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto" />
          <h2 className="text-2xl font-bold">Report Unobtainable</h2>
          <p className="text-zinc-400">{error || "The requested assessment data is unavailable."}</p>
          <Link href={`/dashboard${guestMode ? "?guest=1" : ""}`}>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 mt-4">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 font-sans print:bg-white print:text-zinc-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 print:px-0">
        
        {/* Back Link & Action Bar */}
        <div className="flex items-center justify-between print:hidden">
          <Link href={`/dashboard${guestMode ? "?guest=1" : ""}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          
          <Button 
            onClick={() => window.print()}
            variant="outline" 
            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Print Assessment
          </Button>
        </div>

        {/* Report Overview Card */}
        <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                report.report_type === "file" 
                  ? "bg-cyan-500/10 text-cyan-400 ring-cyan-400/20" 
                  : "bg-indigo-500/10 text-indigo-400 ring-indigo-400/20"
              }`}>
                {report.report_type === "file" ? "Medical Document Analysis" : "Manual Self-Assessment"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">Health Diagnostics & Predicted Cautions</h1>
            </div>
            
            <div className="flex items-center gap-2 text-zinc-400 text-sm shrink-0">
              <Clock className="h-4 w-4" />
              <span>{new Date(report.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* User Details Subcard */}
          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Diagnostic Context</h3>
            
            {report.report_type === "manual" && report.manual_data ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
                <div>
                  <span className="text-zinc-500">Age / Gender:</span>
                  <p className="font-semibold text-zinc-200 mt-0.5 capitalize">{report.manual_data.age} / {report.manual_data.gender}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Primary Symptoms:</span>
                  <p className="font-semibold text-zinc-200 mt-0.5 capitalize line-clamp-2">{report.manual_data.symptoms}</p>
                </div>
                <div>
                  <span className="text-zinc-500">History & Lifestyle:</span>
                  <p className="font-semibold text-zinc-200 mt-0.5 line-clamp-2">
                    {[report.manual_data.medical_history, report.manual_data.lifestyle_factors].filter(Boolean).join(" | ") || "None specified"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 text-sm">
                <span className="text-zinc-500">Extracted Raw Text Snippet:</span>
                <p className="text-zinc-300 mt-1 font-mono text-xs line-clamp-4 overflow-y-auto max-h-24 whitespace-pre-wrap">
                  {report.raw_content || "Processing completed. Text extracted successfully."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Predictions & Cautions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Cautions Panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" /> Predicted Cautions & Risks
            </h2>
            <div className="space-y-4">
              {report.cautions ? formatMarkdown(report.cautions) : (
                <p className="text-zinc-400 text-sm">No specific health alerts generated.</p>
              )}
            </div>
          </div>

          {/* Remedies Panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <Heart className="h-5 w-5 shrink-0" /> Remedial Correctives & Actions
            </h2>
            <div className="space-y-4">
              {report.remedies ? formatMarkdown(report.remedies) : (
                <p className="text-zinc-400 text-sm">No specific corrective measures generated.</p>
              )}
            </div>
          </div>

        </div>

        {/* Disclaimer banner */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-500 leading-relaxed text-center">
          <strong>Disclaimer:</strong> This application is powered by heuristics and AI model predictions for education and preventative guidelines. It is not an alternative to licensed clinical diagnostics. Always seek the advice of your general practitioner or physician.
        </div>

      </div>
    </div>
  );
}
