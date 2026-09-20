"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Bot, Send, Sparkles, User, FileText, CheckCircle2, RefreshCw, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RagChunk {
  chunk_id: string;
  source_doc: string;
  folder_name: string;
  relevance_score: number;
  snippet: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  sources?: string[];
  retrieved_chunks?: RagChunk[];
}

function AssistantContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Hello! I am your **LifeSync RAG Assistant**. I use vector similarity search to search across your documents, metadata attributes, emergency vault, and cross-domain risk alerts to answer your questions accurately with sources."
    }
  ]);

  const quickPrompts = [
    "What expires next month?",
    "Show my travel risks.",
    "Which documents are missing in Vehicle folder?",
    "Where is my passport number stored?",
    "What emergency contacts are saved?"
  ];

  const toggleSources = (index: number) => {
    setExpandedSources(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSend = async (queryText?: string) => {
    const q = queryText || input;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = { sender: "user", text: q };
    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      if (!guestMode) {
        const res = await apiClient.post<{
          answer: string;
          sources?: string[];
          retrieved_chunks?: RagChunk[];
        }>("/api/v1/lifesync/assistant/query", { query: q });

        setMessages(prev => [
          ...prev,
          {
            sender: "ai",
            text: res.answer,
            sources: res.sources,
            retrieved_chunks: res.retrieved_chunks
          }
        ]);
      } else {
        setTimeout(() => {
          let reply = "I analyzed your 7 Smart Folders via RAG vector search. You have 2 critical risk alerts active (Passport Expiry + Flight Ticket correlation) and 1 expired document in your Vehicle folder.";
          let mockSources = ["Passport_Copy.pdf", "Flight_Ticket_NYC.pdf"];
          let mockChunks: RagChunk[] = [
            {
              chunk_id: "doc_1_main",
              source_doc: "Passport_Copy.pdf",
              folder_name: "Travel",
              relevance_score: 94.5,
              snippet: "Passport Document. Passport number: P99088231. Expiry Date: 2026-09-15."
            },
            {
              chunk_id: "doc_2_main",
              source_doc: "Flight_Ticket_NYC.pdf",
              folder_name: "Travel",
              relevance_score: 88.2,
              snippet: "Flight Booking Reference: REF-921B. Flight from NYC on 2026-09-20."
            }
          ];

          if (q.toLowerCase().includes("expire") || q.toLowerCase().includes("renew")) {
            reply = "Upcoming Expiries retrieved from document metadata:\n\n• **Driving Licence**: Expired on 2026-07-15 (Vehicle Folder)\n• **Passport**: Expires on 2026-09-15 (Travel Folder)\n• **Vehicle PUC**: Expires on 2026-08-21 (Vehicle Folder)";
          } else if (q.toLowerCase().includes("travel")) {
            reply = "Travel Readiness Report:\n\n• Passport: Expiring in < 6 months (Critical Risk)\n• Flight Ticket: NYC Flight Confirmed\n• Hotel Booking: Missing Visa Document";
          } else if (q.toLowerCase().includes("emergency") || q.toLowerCase().includes("contact")) {
            reply = "Emergency Vault Retrieval:\n\n• Blood Group: O+\n• Emergency Contact: Sarah Jenkins (+1 555-019-2834)\n• Medical Conditions: Asthma (Mild), Penicillin Allergy";
            mockSources = ["Emergency Vault Profile"];
            mockChunks = [{
              chunk_id: "emergency_vault",
              source_doc: "Emergency Vault",
              folder_name: "Emergency",
              relevance_score: 98.0,
              snippet: "Emergency Contact: Sarah Jenkins. Blood group: O+. Medical Conditions: Asthma."
            }];
          }

          setMessages(prev => [
            ...prev,
            {
              sender: "ai",
              text: reply,
              sources: mockSources,
              retrieved_chunks: mockChunks
            }
          ]);
        }, 700);
      }
    } catch (err: any) {
      const errMsg = err?.status === 401
        ? "⚠️ Session expired. Please sign in again to use the AI Assistant."
        : "⚠️ Could not connect to AI Assistant. Make sure the backend server is running.";
      setMessages(prev => [...prev, { sender: "ai", text: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-purple-900/40 bg-gradient-to-r from-purple-950/40 via-zinc-950 to-zinc-950 p-6 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-purple-500/20 border border-purple-500/30 p-3 text-purple-400">
            <Bot className="h-7 w-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="h-3.5 w-3.5" /> Vector Retrieval Augmented Generation (RAG)
            </div>
            <h1 className="text-2xl font-black text-white">AI Conversational Life Assistant</h1>
            <p className="text-xs text-zinc-400">Semantic vector retrieval over your documents, metadata, emergency profile, and risks.</p>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="text-xs bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-purple-500/50 rounded-xl px-3.5 py-2 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3 text-purple-400" /> {p}
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 h-[560px] flex flex-col justify-between shadow-2xl">
        <div className="overflow-y-auto space-y-5 pr-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`p-2.5 rounded-2xl text-xs font-bold shrink-0 ${m.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                {m.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className="space-y-2 max-w-2xl">
                <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${m.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-950 border border-zinc-800 text-zinc-200'}`}>
                  {m.text}
                </div>

                {/* Sources & Retrieved RAG Chunks Drawer */}
                {m.sender === "ai" && m.retrieved_chunks && m.retrieved_chunks.length > 0 && (
                  <div className="bg-zinc-950/90 border border-purple-900/30 rounded-2xl p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-purple-300 font-bold text-[11px] uppercase tracking-wider">
                        <Layers className="h-3.5 w-3.5 text-purple-400" />
                        Retrieved Context ({m.retrieved_chunks.length} Sources Matched)
                      </div>
                      <button
                        onClick={() => toggleSources(i)}
                        className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                      >
                        {expandedSources[i] ? "Hide Snippets" : "View Snippets"}
                        {expandedSources[i] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>

                    {/* Source Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.retrieved_chunks.map((chunk) => (
                        <span key={chunk.chunk_id} className="inline-flex items-center gap-1.5 bg-purple-950/40 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                          <FileText className="h-3 w-3 text-purple-400" />
                          <span>{chunk.source_doc}</span>
                          <span className="bg-purple-500/20 text-purple-200 px-1.5 py-0.2 rounded font-mono text-[10px]">
                            {chunk.relevance_score}% Match
                          </span>
                        </span>
                      ))}
                    </div>

                    {/* Collapsible Chunk Snippets */}
                    {expandedSources[i] && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-zinc-800">
                        {m.retrieved_chunks.map((chunk) => (
                          <div key={chunk.chunk_id} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] space-y-1">
                            <div className="flex items-center justify-between text-zinc-400 font-semibold">
                              <span>Source: {chunk.source_doc} ({chunk.folder_name} Folder)</span>
                              <span className="text-purple-400 font-mono">{chunk.relevance_score}% relevance</span>
                            </div>
                            <p className="text-zinc-300 font-mono text-[10px] bg-zinc-950 p-2 rounded border border-zinc-800 whitespace-pre-wrap">
                              {chunk.snippet}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-purple-400 bg-purple-500/10 p-3 rounded-xl w-fit">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Performing TF-IDF hybrid vector search over user documents...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-3 pt-4 border-t border-zinc-800">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Ask AI Assistant about your documents, expiries, risk alerts, or vault..."
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-purple-500" 
          />
          <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl px-5 py-3 shadow-lg shadow-purple-600/30">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm p-4">Loading Assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}
