"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient, API_URL } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Clock, FolderKanban, Download, Calendar, Tag, Eye } from "lucide-react";

interface DocumentDetail {
  id: number;
  name: string;
  file_type: string | null;
  file_path: string | null;
  raw_content: string | null;
  folder_id: number | null;
  folder_name: string | null;
  created_at: string | null;
  metadata: Record<string, string>;
}

export default function DocumentPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient
      .get<DocumentDetail>(`/api/v1/lifesync/documents/${id}`)
      .then((data) => setDoc(data))
      .catch(() => setError("Failed to load document details."))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch the file as a blob with the auth token for preview
  useEffect(() => {
    if (!doc) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;

    fetch(`${API_URL}/api/v1/lifesync/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.blob();
      })
      .then((blob) => {
        if (blob) {
          setPreviewBlobUrl(URL.createObjectURL(blob));
        }
      })
      .catch(() => {
        // File may not be available for preview
      });

    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  const fileType = (doc?.file_type || "").toLowerCase();
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(fileType);
  const isPdf = fileType === "pdf";
  const hasFile = doc?.file_path && doc.file_path !== "local-storage";

  const handleDownload = () => {
    if (!previewBlobUrl || !doc) return;
    const a = document.createElement("a");
    a.href = previewBlobUrl;
    a.download = doc.name;
    a.click();
  };

  const metaEntries = doc ? Object.entries(doc.metadata) : [];

  return (
    <div className="space-y-8 font-sans">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="text-zinc-400 hover:text-white flex items-center gap-2 px-0"
      >
        <ArrowLeft size={18} /> Back to Folders
      </Button>

      {loading && (
        <div className="flex items-center gap-3 py-16 justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-zinc-400">Loading document…</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {doc && (
        <>
          {/* Header Card */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-accent/20 border border-accent/30 p-4 text-accent">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{doc.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="bg-zinc-800 px-2.5 py-1 rounded-lg text-xs font-mono uppercase text-zinc-300 border border-zinc-700">
                      {doc.file_type || "unknown"}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <FolderKanban className="h-3 w-3" /> {doc.folder_name || "General"}
                    </span>
                    {doc.created_at && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(doc.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {hasFile && previewBlobUrl && (
                <Button
                  onClick={handleDownload}
                  className="bg-primary hover:bg-blue-600 text-primary-foreground rounded-2xl px-5 py-3 font-semibold flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Download className="h-5 w-5" /> Download File
                </Button>
              )}
            </div>
          </div>

          {/* File Preview */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-400" /> File Preview
            </h2>

            {previewBlobUrl ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 overflow-hidden">
                {isImage && (
                  <img
                    src={previewBlobUrl}
                    alt={doc.name}
                    className="max-w-full h-auto rounded-xl mx-auto"
                  />
                )}
                {isPdf && (
                  <iframe
                    src={previewBlobUrl}
                    title={doc.name}
                    className="w-full h-[75vh] rounded-xl border-0"
                  />
                )}
                {!isImage && !isPdf && (
                  <div className="text-center py-12 space-y-3">
                    <FileText className="h-12 w-12 text-zinc-600 mx-auto" />
                    <p className="text-sm text-zinc-400">
                      Preview not available for <span className="font-mono text-zinc-300">.{fileType}</span> files.
                    </p>
                    <Button onClick={handleDownload} variant="outline" className="rounded-xl">
                      <Download className="h-4 w-4 mr-2" /> Download to View
                    </Button>
                  </div>
                )}
              </div>
            ) : hasFile ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl space-y-2">
                <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-zinc-500">Loading preview…</p>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl space-y-2">
                <FileText className="h-10 w-10 text-zinc-700 mx-auto" />
                <p className="text-xs text-zinc-500">No file attached — this is a metadata-only document entry.</p>
              </div>
            )}
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metadata */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-400" /> Document Metadata
              </h2>

              {metaEntries.length === 0 ? (
                <p className="text-xs text-zinc-500">No metadata extracted for this document.</p>
              ) : (
                <div className="space-y-3">
                  {metaEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/80"
                    >
                      <span className="text-xs text-zinc-400 capitalize">{key.replace(/_/g, " ")}</span>
                      <span className={`text-sm font-semibold ${
                        key.includes("expiry") || key.includes("date")
                          ? "text-amber-400"
                          : "text-zinc-200"
                      }`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Info */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" /> Document Info
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Document ID</span>
                  <span className="text-sm font-mono text-zinc-200">#{doc.id}</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-xs text-zinc-400">File Type</span>
                  <span className="text-sm font-mono uppercase text-zinc-200">{doc.file_type || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Folder</span>
                  <span className="text-sm text-indigo-300">{doc.folder_name || "General"}</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Uploaded At</span>
                  <span className="text-sm text-zinc-200">
                    {doc.created_at ? new Date(doc.created_at).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-xs text-zinc-400">File Available</span>
                  <span className={`text-sm font-semibold ${hasFile ? "text-emerald-400" : "text-zinc-500"}`}>
                    {hasFile ? "Yes" : "Metadata Only"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
