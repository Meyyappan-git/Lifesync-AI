"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient, API_URL } from "@/lib/api-client";
import { FolderKanban, ArrowRight, Plus, PlusCircle, CheckCircle2, AlertCircle, Share2, GitBranch, FolderPlus, FileText, Upload, Trash2, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FolderStat {
  folder_id: number;
  folder_name: string;
  completion_pct: number;
  doc_count: number;
  missing_docs: string[];
}

interface FolderDocument {
  id: number;
  name: string;
  file_type: string | null;
  created_at: string | null;
  metadata: Record<string, string>;
}

function FoldersContent() {
  const [folders, setFolders] = useState<FolderStat[]>([]);
  const [activeFolder, setActiveFolder] = useState<FolderStat | null>(null);
  const [folderDocs, setFolderDocs] = useState<FolderDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  // Custom Folder Creation state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Upload Form states
  const [selectedFolderId, setSelectedFolderId] = useState<string>("auto");
  const [customFolderName, setCustomFolderName] = useState("");
  const [docName, setDocName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const nameWithoutExt = selectedFile.name.split(".").slice(0, -1).join(".");
      setDocName(nameWithoutExt || selectedFile.name);
    }
  };

  const loadFolders = () => {
    if (guestMode) {
      const mock: FolderStat[] = [
        { folder_id: 1, folder_name: "Personal Passports", completion_pct: 100, doc_count: 2, missing_docs: [] },
        { folder_id: 2, folder_name: "Medical Records", completion_pct: 100, doc_count: 1, missing_docs: [] },
        { folder_id: 3, folder_name: "Tax & Financials", completion_pct: 100, doc_count: 1, missing_docs: [] },
        { folder_id: 4, folder_name: "Vehicle Papers", completion_pct: 100, doc_count: 0, missing_docs: [] },
      ];
      setFolders(mock);
      const folderIdParam = searchParams.get("folder_id");
      const matched = folderIdParam ? mock.find(m => m.folder_id === Number(folderIdParam)) : null;
      setActiveFolder(matched || mock[0]);
      return;
    }

    apiClient.get<FolderStat[]>('/api/v1/lifesync/folders')
      .then((data) => {
        setFolders(data || []);
        if (data && data.length > 0) {
          const folderIdParam = searchParams.get("folder_id");
          const matched = folderIdParam ? data.find(m => m.folder_id === Number(folderIdParam)) : null;
          setActiveFolder((prev) => matched || (prev ? (data.find(d => d.folder_id === prev.folder_id) || data[0]) : data[0]));
        }
        setApiError(null);
      })
      .catch((err) => {
        setFolders([]);
        if (err?.status === 401) {
          setApiError("Session expired. Please sign in again.");
        } else {
          setApiError("Could not load folders. Make sure you are signed in.");
        }
      });
  };

  const loadFolderDocs = (folderId: number) => {
    if (guestMode) {
      const folder = folders.find(f => f.folder_id === folderId);
      const fname = folder?.folder_name || "";
      const mockDocs: FolderDocument[] = [];
      if (fname.includes("Passport")) {
        mockDocs.push(
          { id: 101, name: "Passport_Scan_Main.pdf", file_type: "pdf", created_at: new Date().toISOString(), metadata: { expiry_date: "2031-05-12" } },
          { id: 102, name: "Entry_Visa_NYC.pdf", file_type: "pdf", created_at: new Date().toISOString(), metadata: { expiry_date: "2027-01-01" } }
        );
      } else if (fname.includes("Medical")) {
        mockDocs.push(
          { id: 103, name: "Annual_Health_Insurance_Policy.pdf", file_type: "pdf", created_at: new Date().toISOString(), metadata: { expiry_date: "2026-12-31" } }
        );
      } else if (fname.includes("Tax")) {
        mockDocs.push(
          { id: 104, name: "Tax_Receipt_FY25.pdf", file_type: "pdf", created_at: new Date().toISOString(), metadata: {} }
        );
      }
      setFolderDocs(mockDocs);
      setDocsError(null);
      return;
    }

    setLoadingDocs(true);
    setDocsError(null);
    setFolderDocs([]);
    apiClient.get<{ folder: any, documents: FolderDocument[] }>(`/api/v1/lifesync/folders/${folderId}`)
      .then((data) => {
        setFolderDocs(data?.documents || []);
        setDocsError(null);
      })
      .catch((err) => {
        console.error("[FolderDocs] Failed to load documents for folder", folderId, err);
        setFolderDocs([]);
        if (err?.status === 401) {
          setDocsError("Session expired — please sign in again.");
        } else if (err?.status === 404) {
          // Folder exists but has no accessible documents – show empty state
          setDocsError(null);
        } else {
          setDocsError(`Could not load files (Error ${err?.status || 'unknown'}). Check your connection or sign in.`);
        }
      })
      .finally(() => {
        setLoadingDocs(false);
      });
  };

  useEffect(() => {
    loadFolders();
  }, [guestMode]);

  useEffect(() => {
    if (activeFolder) {
      loadFolderDocs(activeFolder.folder_id);
    } else {
      setFolderDocs([]);
      setDocsError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder?.folder_id]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);

    try {
      if (!guestMode) {
        await apiClient.post('/api/v1/lifesync/folders', {
          name: newFolderName.trim(),
          description: newFolderDesc.trim() || undefined
        });
      } else {
        const newMock: FolderStat = {
          folder_id: Date.now(),
          folder_name: newFolderName.trim(),
          completion_pct: 100,
          doc_count: 0,
          missing_docs: []
        };
        setFolders((prev) => [...prev, newMock]);
        setActiveFolder(newMock);
      }
      setNewFolderName("");
      setNewFolderDesc("");
      setShowCreateFolder(false);
      loadFolders();
    } catch {
      alert("Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    setUploading(true);
    setFeedback(null);

    let targetFolderId: number | undefined = undefined;
    let targetFolderName: string | undefined = undefined;

    if (selectedFolderId === "new") {
      targetFolderName = customFolderName.trim();
    } else if (selectedFolderId !== "auto") {
      targetFolderId = Number(selectedFolderId);
    } else if (activeFolder) {
      targetFolderId = activeFolder.folder_id;
    }

    try {
      if (!guestMode) {
        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          if (targetFolderId) formData.append("folder_id", String(targetFolderId));
          if (targetFolderName) formData.append("folder_name", targetFolderName);
          if (expiryDate) formData.append("expiry_date", expiryDate);

          const response = await apiClient.post("/api/v1/lifesync/documents/upload", formData);

          // apiClient throws on error, so if we reach here it was successful
        } else {
          await apiClient.post('/api/v1/lifesync/documents', {
            name: docName.trim(),
            folder_id: targetFolderId,
            folder_name: targetFolderName,
            expiry_date: expiryDate || undefined
          });
        }
      } else {
        // Mock add for Guest Mode
        const newMockDoc: FolderDocument = {
          id: Date.now(),
          name: docName.trim(),
          file_type: file?.name.split(".").pop() || "pdf",
          created_at: new Date().toISOString(),
          metadata: expiryDate ? { expiry_date: expiryDate } : {}
        };
        setFolderDocs((prev) => [...prev, newMockDoc]);
        setFolders(prev => prev.map(f => {
          if (f.folder_id === (targetFolderId || activeFolder?.folder_id)) {
            return { ...f, doc_count: f.doc_count + 1 };
          }
          return f;
        }));
      }

      // After successful upload (both guest and real), refresh folder documents
      setFeedback(`Document '${docName}' uploaded successfully.`);
      setDocName("");
      setExpiryDate("");
      setCustomFolderName("");
      setSelectedFolderId("auto");
      setFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      // Refresh folder list to capture any new folder, then load its documents
      await loadFolders();
      let folderIdToLoad = targetFolderId;
      if (!folderIdToLoad && targetFolderName) {
        const newFolder = folders.find((f) => f.folder_name === targetFolderName);
        folderIdToLoad = newFolder?.folder_id;
      }
      if (!folderIdToLoad) {
        // fallback to currently active folder after reload
        folderIdToLoad = activeFolder?.folder_id;
      }
      if (folderIdToLoad) {
        loadFolderDocs(folderIdToLoad);
      }
    } catch {
      setFeedback("Failed to add document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      if (!guestMode) {
        await apiClient.delete(`/api/v1/lifesync/documents/${docId}`);
      }
      setFeedback("Document deleted successfully.");
      setTimeout(() => setFeedback(null), 4000);
      
      if (guestMode) {
        setFolderDocs(prev => prev.filter(d => d.id !== docId));
        setFolders(prev => prev.map(f => {
          if (f.folder_id === activeFolder?.folder_id) {
            return { ...f, doc_count: Math.max(0, f.doc_count - 1) };
          }
          return f;
        }));
      } else {
        // Optimistically remove from the list immediately, then refresh
        setFolderDocs(prev => prev.filter(d => d.id !== docId));
        loadFolders();
        if (activeFolder) {
          loadFolderDocs(activeFolder.folder_id);
        }
      }
    } catch {
      setFeedback("Failed to delete document. Please try again.");
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleDeleteFolder = async (folderId: number, folderName: string) => {
    if (!confirm(`Are you sure you want to delete the folder "${folderName}"?`)) return;
    try {
      if (!guestMode) {
        await apiClient.delete(`/api/v1/lifesync/folders/${folderId}`);
      }
      setFeedback(`Folder '${folderName}' deleted successfully.`);
      setTimeout(() => setFeedback(null), 4000);

      setFolders((prev) => {
        const updated = prev.filter((f) => f.folder_id !== folderId);
        if (activeFolder?.folder_id === folderId) {
          setActiveFolder(updated.length > 0 ? updated[0] : null);
        }
        return updated;
      });

      if (!guestMode) {
        loadFolders();
      }
    } catch {
      setFeedback(`Failed to delete folder '${folderName}'. Please try again.`);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Auth error banner */}
      {apiError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {apiError} <a href="/login" className="ml-auto text-xs underline text-rose-400">Sign in</a>
        </div>
      )}

      {/* Header */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-500/20 border border-indigo-500/30 p-4 text-indigo-400">
            <FolderKanban className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Document Folders & Vault</h1>
            <p className="text-sm text-zinc-400 mt-1">Organize documents in custom user folders or assign categories directly during upload.</p>
          </div>
        </div>

        <Button 
          onClick={() => setShowCreateFolder(true)} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-5 py-3 font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <FolderPlus className="h-5 w-5" /> + New Custom Folder
        </Button>
      </div>

      {/* Create Custom Folder Inline Form / Modal */}
      {showCreateFolder && (
        <div className="rounded-3xl border border-indigo-500/40 bg-zinc-900 p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-indigo-400" /> Create Custom Folder
            </h3>
            <button onClick={() => setShowCreateFolder(false)} className="text-zinc-400 hover:text-white text-xs">Cancel</button>
          </div>

          <form onSubmit={handleCreateFolder} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Folder Name *</label>
              <input 
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Passport & Visas, Tax Invoices 2026"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Description (Optional)</label>
              <input 
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                placeholder="e.g. Important identity & trip approvals"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creatingFolder} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 font-medium">
                {creatingFolder ? "Creating..." : "Save Folder"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {folders.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-zinc-900/50 rounded-3xl border border-zinc-800 space-y-3">
            <FolderKanban className="h-10 w-10 text-zinc-600 mx-auto" />
            <p className="text-zinc-400 text-sm">No folders created yet. Click "+ New Custom Folder" or upload a document to get started.</p>
          </div>
        ) : (
          folders.map((f) => (
            <div 
              key={f.folder_id} 
              onClick={() => {
                setActiveFolder(f);
                // Scroll the detail panel into view on mobile
                setTimeout(() => {
                  document.getElementById('folder-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
                // Load the latest documents for this folder
                loadFolderDocs(f.folder_id);
              }}
              className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-4 ${activeFolder?.folder_id === f.folder_id ? 'bg-zinc-900 border-indigo-500 shadow-xl shadow-indigo-950/40 ring-1 ring-indigo-500' : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-400" /> {f.folder_name}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
                    {f.doc_count} {f.doc_count === 1 ? 'file' : 'files'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(f.folder_id, f.folder_name);
                    }}
                    className="text-zinc-500 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all"
                    title={`Delete folder ${f.folder_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-zinc-400 space-y-2 pt-2 border-t border-zinc-800/60">
                <div className="flex items-center justify-between text-zinc-300">
                  <span>Folder Status:</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Active & Indexed
                  </span>
                </div>
                {activeFolder?.folder_id === f.folder_id && (
                  <div className="text-indigo-400 font-medium flex items-center gap-1 pt-1">
                    <ArrowRight className="h-3 w-3" /> Viewing files below ↓
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Folder Interactive Detail & Document Uploader */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Folder Documents & Upload</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">
              {activeFolder ? `${activeFolder.folder_name} Folder` : "Document Upload & Vault"}
            </h2>
          </div>
          {activeFolder && (
            <Button
              onClick={() => handleDeleteFolder(activeFolder.folder_id, activeFolder.folder_name)}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl px-4 py-2 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              title={`Delete folder ${activeFolder.folder_name}`}
            >
              <Trash2 className="h-4 w-4 text-rose-400" /> Delete Folder
            </Button>
          )}
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Document Uploader with Folder Selection */}
          <div className="space-y-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-400" /> Upload Document & Assign Folder
            </h3>
            
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Target Folder / Category</label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {activeFolder && (
                    <option value="auto">Use Selected Folder ({activeFolder.folder_name})</option>
                  )}
                  {folders.map((f) => (
                    <option key={f.folder_id} value={f.folder_id}>
                      {f.folder_name} ({f.doc_count} files)
                    </option>
                  ))}
                  <option value="new">+ Create New Custom Folder...</option>
                </select>
              </div>

              {selectedFolderId === "new" && (
                <div className="animate-in fade-in duration-150">
                  <label className="text-xs text-indigo-300 block mb-1">New Folder Name *</label>
                  <input
                    required
                    value={customFolderName}
                    onChange={(e) => setCustomFolderName(e.target.value)}
                    placeholder="e.g. Identity Proofs, Medical Prescriptions"
                    className="w-full bg-zinc-900 border border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Select File (Optional)</label>
                <input 
                  type="file"
                  id="file-input"
                  onChange={handleFileChange}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700" 
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Document Name / Title *</label>
                <input 
                  required
                  value={docName} 
                  onChange={e => setDocName(e.target.value)} 
                  placeholder="e.g. Passport Copy, Annual Tax Receipt"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" 
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Expiry Date (Optional)</label>
                <input 
                  type="date"
                  value={expiryDate} 
                  onChange={e => setExpiryDate(e.target.value)} 
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" 
                />
              </div>

              <Button type="submit" disabled={uploading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 font-medium">
                {uploading ? "Uploading..." : "Upload & Save Document"}
              </Button>
            </form>

            {feedback && <p className="text-xs text-emerald-400 font-medium pt-1">{feedback}</p>}
          </div>

          {/* Folder Documents List */}
          <div id="folder-detail-panel" className="space-y-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between min-h-[400px]">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                Files in: <span className="text-indigo-300 normal-case font-semibold">{activeFolder?.folder_name || 'Select a folder'}</span>
              </h3>

              {loadingDocs ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-zinc-400 text-sm">Loading files...</p>
                </div>
              ) : docsError ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-300 flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{docsError}</span>
                  <button 
                    onClick={() => activeFolder && loadFolderDocs(activeFolder.folder_id)}
                    className="ml-auto text-xs underline text-rose-400 hover:text-rose-300"
                  >Retry</button>
                </div>
              ) : folderDocs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl space-y-2">
                  <FolderKanban className="h-8 w-8 text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-500">No documents uploaded to this folder yet.</p>
                  <p className="text-xs text-zinc-600">Use the upload form on the left to add files.</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[320px] pr-2">
                  {folderDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 text-xs bg-zinc-900/80 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                      <Link
                        href={`/dashboard/document/${doc.id}`}
                        className="flex-1 min-w-0 p-3 block"
                      >
                        <p className="font-semibold text-zinc-200 truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                          <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono uppercase">{doc.file_type || "pdf"}</span>
                          {doc.metadata?.expiry_date && (
                            <span className="text-amber-400/90 font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Expires: {doc.metadata.expiry_date}
                            </span>
                          )}
                          {doc.created_at && (
                            <span className="text-zinc-600">Added: {new Date(doc.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </Link>

                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteDoc(doc.id); }}
                        className="text-zinc-500 hover:text-rose-400 p-2 mr-1 hover:bg-rose-500/10 rounded-lg transition-all flex-shrink-0"
                        title="Delete Document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-zinc-500 border-t border-zinc-800/80 pt-4 mt-auto">
              Files uploaded here participate in real-time cross-domain alert analytics and AI Assistant query lookups.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FoldersPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm p-4">Loading Folders...</div>}>
      <FoldersContent />
    </Suspense>
  );
}
