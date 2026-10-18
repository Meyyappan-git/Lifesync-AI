"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { getAccessToken } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft, FileText, Clock, FolderKanban, Download,
  Calendar, Tag, Eye, Edit2, Link2, Plus, Trash2,
  CheckCircle2, GitBranch, AlertCircle
} from "lucide-react";

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

interface RelationshipItem {
  id: number;
  source_document_id: number;
  target_document_id: number;
  is_source: boolean;
  relationship_type: string;
  notes: string | null;
  linked_doc_id: number;
  linked_doc_name: string;
  linked_doc_folder: string;
  linked_doc_type: string;
  created_at: string | null;
}

export default function DocumentPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Edit Document States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFolderId, setEditFolderId] = useState<string>("");
  const [editMetadata, setEditMetadata] = useState<Array<{ key: string; value: string }>>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [availableFolders, setAvailableFolders] = useState<Array<{ folder_id: number; folder_name: string }>>([]);

  // Relationships States
  const [relationships, setRelationships] = useState<RelationshipItem[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<Array<{ id: number; name: string; folder_name?: string }>>([]);
  const [linkTargetDocId, setLinkTargetDocId] = useState<string>("");
  const [linkRelType, setLinkRelType] = useState<string>("depends_on");
  const [linkNotes, setLinkNotes] = useState<string>("");
  const [linking, setLinking] = useState(false);

  const fetchDocDetails = () => {
    if (!id) return;
    apiClient
      .get<DocumentDetail>(`/api/v1/lifesync/documents/${id}`)
      .then((data) => {
        setDoc(data);
        setEditName(data.name);
        setEditFolderId(data.folder_id ? String(data.folder_id) : "");
        setEditMetadata(
          Object.entries(data.metadata || {}).map(([k, v]) => ({ key: k, value: v }))
        );
      })
      .catch(() => setError("Failed to load document details."))
      .finally(() => setLoading(false));

    // Fetch relationships
    apiClient
      .get<RelationshipItem[]>(`/api/v1/lifesync/documents/${id}/relationships`)
      .then((rels) => setRelationships(rels || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchDocDetails();
    // Load available folders
    apiClient.get<any[]>("/api/v1/lifesync/folders")
      .then((res) => setAvailableFolders(res || []))
      .catch(() => {});

    // Load available docs for linking
    apiClient.get<any>("/api/v1/lifesync/dashboard")
      .then((res) => {
        if (res?.documents) {
          setAvailableDocs(res.documents.filter((d: any) => String(d.id) !== String(id)));
        }
      })
      .catch(() => {});
  }, [id]);


  // Fetch the file as a blob with the auth token for preview
  useEffect(() => {
    if (!doc) return;
    const token = getAccessToken();
    if (!token) return;

    fetch(`/api/v1/lifesync/documents/${doc.id}/download`, {
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;
    setSavingEdit(true);
    setFeedback(null);
    try {
      const metaObj: Record<string, string> = {};
      editMetadata.forEach(({ key, value }) => {
        if (key.trim()) metaObj[key.trim()] = value.trim();
      });

      await apiClient.patch(`/api/v1/lifesync/documents/${doc.id}`, {
        name: editName.trim(),
        folder_id: editFolderId ? Number(editFolderId) : undefined,
        metadata: metaObj,
      });
      fetchDocDetails();
      setShowEditModal(false);
      setFeedback("Document updated successfully!");
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback("Failed to update document.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc || !linkTargetDocId) return;
    setLinking(true);
    try {
      await apiClient.post(`/api/v1/lifesync/documents/${doc.id}/relationships`, {
        target_document_id: Number(linkTargetDocId),
        relationship_type: linkRelType,
        notes: linkNotes.trim() || undefined,
      });
      fetchDocDetails();
      setShowLinkModal(false);
      setLinkTargetDocId("");
      setLinkNotes("");
      setFeedback("Document relationship established!");
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback("Failed to link documents.");
    } finally {
      setLinking(false);
    }
  };

  const handleDeleteRelationship = async (relId: number) => {
    try {
      await apiClient.delete(`/api/v1/lifesync/documents/relationships/${relId}`);
      fetchDocDetails();
      setFeedback("Relationship unlinked.");
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback("Failed to delete relationship.");
    }
  };

  const metaEntries = doc ? Object.entries(doc.metadata) : [];


  return (
    <div className="space-y-8 font-sans">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="text-slate-600 hover:text-slate-900 flex items-center gap-2 px-0"
      >
        <ArrowLeft size={18} /> Back to Folders
      </Button>

      {loading && (
        <div className="flex items-center gap-3 py-16 justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <p className="text-slate-600">Loading document…</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-50/40 p-6 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {doc && (
        <>
          {/* Header Card */}
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-accent/20 border border-accent/30 p-4 text-accent">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{doc.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-mono uppercase text-slate-700 border border-slate-300">
                      {doc.file_type || "unknown"}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <FolderKanban className="h-3 w-3" /> {doc.folder_name || "General"}
                    </span>
                    {doc.created_at && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(doc.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setShowEditModal(true)}
                  variant="outline"
                  className="border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl px-4 py-2.5 font-semibold flex items-center gap-2 shadow-md text-xs sm:text-sm"
                >
                  <Edit2 className="h-4 w-4 text-teal-700" /> Edit Metadata & Folder
                </Button>

                {hasFile && previewBlobUrl && (
                  <Button
                    onClick={handleDownload}
                    className="bg-primary hover:bg-teal-700 text-primary-foreground rounded-2xl px-5 py-2.5 font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 text-xs sm:text-sm"
                  >
                    <Download className="h-4 w-4" /> Download File
                  </Button>
                )}
              </div>
            </div>
          </div>


          {/* File Preview */}
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-700" /> File Preview
            </h2>

            {previewBlobUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 overflow-hidden">
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
                    <FileText className="h-12 w-12 text-slate-600 mx-auto" />
                    <p className="text-sm text-slate-600">
                      Preview not available for <span className="font-mono text-slate-700">.{fileType}</span> files.
                    </p>
                    <Button onClick={handleDownload} variant="outline" className="rounded-xl">
                      <Download className="h-4 w-4 mr-2" /> Download to View
                    </Button>
                  </div>
                )}
              </div>
            ) : hasFile ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <div className="h-5 w-5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Loading preview…</p>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <FileText className="h-10 w-10 text-slate-700 mx-auto" />
                <p className="text-xs text-slate-500">No file attached — this is a metadata-only document entry.</p>
              </div>
            )}
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metadata */}
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-700" /> Document Metadata
              </h2>

              {metaEntries.length === 0 ? (
                <p className="text-xs text-slate-500">No metadata extracted for this document.</p>
              ) : (
                <div className="space-y-3">
                  {metaEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80"
                    >
                      <span className="text-xs text-slate-600 capitalize">{key.replace(/_/g, " ")}</span>
                      <span className={`text-sm font-semibold ${
                        key.includes("expiry") || key.includes("date")
                          ? "text-amber-700"
                          : "text-slate-800"
                      }`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Info */}
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-700" /> Document Info
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-xs text-slate-600">Document ID</span>
                  <span className="text-sm font-mono text-slate-800">#{doc.id}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-xs text-slate-600">File Type</span>
                  <span className="text-sm font-mono uppercase text-slate-800">{doc.file_type || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-xs text-slate-600">Folder</span>
                  <span className="text-sm text-teal-700">{doc.folder_name || "General"}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-xs text-slate-600">Uploaded At</span>
                  <span className="text-sm text-slate-800">
                    {doc.created_at ? new Date(doc.created_at).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-xs text-slate-600">File Available</span>
                  <span className={`text-sm font-semibold ${hasFile ? "text-emerald-700" : "text-slate-500"}`}>
                    {hasFile ? "Yes" : "Metadata Only"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* OCR Extracted Text & RAG Index Status */}
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-700" /> OCR Extracted Text & RAG Knowledge Index
              </h2>
              <span className="bg-emerald-500/10 text-emerald-700 text-xs px-3 py-1 rounded-full border border-emerald-500/20 font-medium">
                Indexed in RAG Vector Store
              </span>
            </div>

            {doc.raw_content ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 font-mono text-xs text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                {doc.raw_content}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No OCR raw text extracted yet.</p>
            )}
          </div>

          {/* Linked Documents & Cross-Folder Relationships */}
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2 text-cyan-700">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Linked Documents & Dependencies
                  </h2>
                  <p className="text-xs text-slate-600">Cross-folder document dependencies and superseded versions</p>
                </div>
              </div>

              <Button
                onClick={() => setShowLinkModal(true)}
                className="bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
              >
                <Plus className="h-4 w-4" /> Link Another Document
              </Button>
            </div>

            {relationships.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <Link2 className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No Document Links Established</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Connect dependent files across folders (e.g. Flight Ticket depends on Passport, Driving Licence ↔ Vehicle RC).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relationships.map((rel) => (
                  <div key={rel.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3 group hover:border-slate-300 transition-all shadow-md">
                    <div className="space-y-1.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${
                          rel.relationship_type === "depends_on"
                            ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                            : rel.relationship_type === "supersedes"
                            ? "bg-cyan-500/15 text-cyan-700 border-cyan-500/30"
                            : "bg-cyan-500/15 text-cyan-700 border-cyan-500/30"
                        }`}>
                          {rel.relationship_type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                          {rel.linked_doc_folder}
                        </span>
                      </div>
                      <Link
                        href={`/dashboard/document/${rel.linked_doc_id}`}
                        className="text-sm font-bold text-slate-900 hover:text-cyan-700 transition-colors block truncate"
                        title={rel.linked_doc_name}
                      >
                        {rel.linked_doc_name}
                      </Link>
                      {rel.notes && (
                        <p className="text-xs text-slate-600 italic line-clamp-1">"{rel.notes}"</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteRelationship(rel.id)}
                      className="text-slate-600 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50/20 transition-all shrink-0"
                      title="Unlink Relationship"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── EDIT DOCUMENT MODAL ────────────────────────────────────────── */}
      {showEditModal && doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-teal-700" /> Edit Document & Metadata
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-500 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Document Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Folder / Category</label>
                <select
                  value={editFolderId}
                  onChange={(e) => setEditFolderId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="">Unassigned / General</option>
                  {availableFolders.map((f) => (
                    <option key={f.folder_id} value={f.folder_id}>
                      {f.folder_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Metadata Entries */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Metadata Tags</label>
                  <button
                    type="button"
                    onClick={() => setEditMetadata([...editMetadata, { key: "", value: "" }])}
                    className="text-xs text-teal-700 hover:text-teal-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Tag
                  </button>
                </div>

                {editMetadata.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Key (e.g. expiry_date)"
                      value={m.key}
                      onChange={(e) => {
                        const copy = [...editMetadata];
                        copy[idx].key = e.target.value;
                        setEditMetadata(copy);
                      }}
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={m.value}
                      onChange={(e) => {
                        const copy = [...editMetadata];
                        copy[idx].value = e.target.value;
                        setEditMetadata(copy);
                      }}
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setEditMetadata(editMetadata.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEditModal(false)}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-teal-700 hover:bg-teal-600 text-white rounded-xl px-5 py-2 text-xs font-bold shadow-lg shadow-teal-600/20"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── LINK DOCUMENT RELATIONSHIP MODAL ────────────────────────────── */}
      {showLinkModal && doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-cyan-700" /> Link Related Document
              </h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-slate-500 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRelationship} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Target Document to Link</label>
                <select
                  required
                  value={linkTargetDocId}
                  onChange={(e) => setLinkTargetDocId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select a document...</option>
                  {availableDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.folder_name ? `(${d.folder_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Relationship Type</label>
                <select
                  value={linkRelType}
                  onChange={(e) => setLinkRelType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-500"
                >
                  <option value="depends_on">Depends On (e.g., flight depends on passport)</option>
                  <option value="related_to">Related To (e.g., car insurance ↔ RC)</option>
                  <option value="supersedes">Supersedes (e.g., renewed policy replaces old)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Relationship Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Required for check-in and boarding"
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowLinkModal(false)}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={linking || !linkTargetDocId}
                  className="bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl px-5 py-2 text-xs font-bold shadow-lg shadow-cyan-600/20"
                >
                  {linking ? "Linking..." : "Establish Link"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

