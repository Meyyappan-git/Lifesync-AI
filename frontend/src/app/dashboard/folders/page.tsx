"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { FolderKanban, ArrowRight, Sparkles, PlusCircle } from "lucide-react";

interface FolderSummary {
  id: number;
  name: string;
  description: string | null;
  document_count: number;
}

export default function FoldersPage() {
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [name, setName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [fileType, setFileType] = useState("pdf");
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadFolders = () => {
    apiClient.get<{ folders: FolderSummary[] }>('/api/v1/lifesync/dashboard').then((data) => setFolders(data.folders || [])).catch(() => setFolders([]));
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setFeedback(null);

    try {
      await apiClient.post('/api/v1/lifesync/documents', {
        name: name.trim(),
        folder_id: selectedFolder ? Number(selectedFolder) : null,
        file_type: fileType,
      });
      setName("");
      setSelectedFolder("");
      setFileType("pdf");
      setFeedback("Document recorded and linked to your LifeSync workspace.");
      loadFolders();
    } catch {
      setFeedback("Unable to record the document right now.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-400">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Smart Life Folders</h1>
            <p className="text-sm text-zinc-400">AI groups your documents into travel, vehicle, health, finance, and more.</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <PlusCircle className="h-4 w-4 text-indigo-400" />
          Record a new document
        </div>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3 md:grid-cols-[1.3fr_0.8fr_0.6fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Document name"
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
          />
          <select
            value={selectedFolder}
            onChange={(event) => setSelectedFolder(event.target.value)}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
          <select
            value={fileType}
            onChange={(event) => setFileType(event.target.value)}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
            <option value="docx">Docx</option>
          </select>
          <button type="submit" disabled={creating} className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
            {creating ? "Saving..." : "Save"}
          </button>
        </form>
        {feedback ? <p className="mt-3 text-sm text-zinc-400">{feedback}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {folders.map((folder) => (
          <div key={folder.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{folder.name}</h2>
                <p className="mt-2 text-sm text-zinc-400">{folder.description || 'AI classified folder'}</p>
              </div>
              <div className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-300">{folder.document_count} docs</div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-zinc-400">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Relationship discovery and completeness scoring ready
            </div>
            <button className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-300">
              Open folder <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
