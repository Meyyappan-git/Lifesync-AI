"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  ArrowLeft, 
  Activity, 
  Upload, 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

export default function NewReportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Manual Form States
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState("male");
  const [symptoms, setSymptoms] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [lifestyleFactors, setLifestyleFactors] = useState("");

  // Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const report = await apiClient.post<{ id: number }>(
        "/api/v1/health/analyze-manual",
        {
          age,
          gender,
          symptoms,
          medical_history: medicalHistory,
          lifestyle_factors: lifestyleFactors
        }
      );
      await apiClient.post("/api/v1/lifesync/documents", {
        name: `Assessment ${new Date().toLocaleDateString()}`,
        file_type: "report",
      });
      router.push(`/dashboard/report/${report.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.detail || "Manual analysis submission failed");
      } else {
        setError("An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const report = await apiClient.post<{id: number}>("/api/v1/health/analyze-file", formData);
      router.push(`/dashboard/report/${report.id}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during file upload");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Back Link */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">New Health Assessment</h1>
          <p className="text-zinc-400">Choose between manual entry of health data/symptoms or uploading a medical scan/report.</p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-3 text-rose-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <h5 className="font-semibold text-sm">Assessment Error</h5>
              <p className="text-xs text-rose-300/90 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => { setActiveTab("manual"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "manual" 
                ? "bg-zinc-800 text-white shadow-sm" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ClipboardList className="h-4 w-4" /> Manual Self-Assessment
          </button>
          
          <button
            onClick={() => { setActiveTab("upload"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "upload" 
                ? "bg-zinc-800 text-white shadow-sm" 
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Upload className="h-4 w-4" /> Upload Medical Scan
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <Activity className="h-12 w-12 animate-spin text-indigo-500 mx-auto" />
              <div className="space-y-1">
                <p className="font-bold text-lg text-white">Analyzing Health Profile</p>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                  Our system is processing the parameters and generating predicted cautions and preventative remedies...
                </p>
              </div>
            </div>
          ) : activeTab === "manual" ? (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 30)}
                    className="mt-2 block w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="mt-2 block w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Symptoms & Concerns</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Occasional chest tightness, high sugar levels, chronic cough..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="mt-2 block w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Medical History (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. High blood pressure diagnosed 2 years ago, family history of diabetes..."
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="mt-2 block w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Lifestyle Factors (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Regular smoker, high stress environment, sedentary job..."
                  value={lifestyleFactors}
                  onChange={(e) => setLifestyleFactors(e.target.value)}
                  className="mt-2 block w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/10">
                  Analyze & Predict Cautions
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFileUploadSubmit} className="space-y-6">
              <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center hover:border-zinc-500 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="file-upload" className="cursor-pointer block space-y-4">
                  <div className="p-4 bg-zinc-800 w-16 h-16 rounded-full mx-auto flex items-center justify-center text-zinc-400">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-200 font-medium">Click to select document or image</p>
                    <p className="text-xs text-zinc-500">Supports PDF, PNG, JPG, or JPEG files</p>
                  </div>
                </label>

                {selectedFile && (
                  <div className="mt-6 flex items-center justify-center gap-2 p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-sm max-w-md mx-auto">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                    <span className="truncate font-medium">{selectedFile.name}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={!selectedFile}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/10 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
                >
                  Upload & Scan Report
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
