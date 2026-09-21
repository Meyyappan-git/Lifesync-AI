"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Bot, Send, Sparkles, User, FileText, CheckCircle2, RefreshCw, Layers, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface SourceChunk {
  id: number;
  document_id: number;
  name: string;
  folder?: string;
  page?: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  sources?: SourceChunk[];
  found?: boolean;
  confidence?: string;
  error?: boolean;
}

function AssistantContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Hello! I am your LifeSync AI Assistant. I can answer questions about your documents, deadlines, risk alerts, and emergency vault."
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // In a real app we'd fetch these from the backend based on user's actual stored data
  const quickPrompts = [
    "What expires next month?",
    "Show my travel risks.",
    "Where is my passport number stored?",
    "What emergency contacts are saved?"
  ];

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
          sources?: SourceChunk[];
          found?: boolean;
          confidence?: string;
          request_id?: string;
        }>("/api/v1/lifesync/assistant/query", { query: q });

        setMessages(prev => [
          ...prev,
          {
            sender: "ai",
            text: res.answer,
            sources: res.sources,
            found: res.found,
            confidence: res.confidence
          }
        ]);
      } else {
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              sender: "ai",
              text: "This is a demo response in guest mode.",
              sources: []
            }
          ]);
        }, 700);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        sender: "ai", 
        text: "I couldn't answer that right now. Please try again later.",
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const retryLast = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.sender === "user");
    if (lastUserMsg) {
      setMessages(prev => prev.slice(0, prev.length - 1));
      handleSend(lastUserMsg.text);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex-none rounded-3xl border border-purple-900/40 bg-gradient-to-r from-purple-950/40 via-zinc-950 to-zinc-950 p-6 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-purple-500/20 border border-purple-500/30 p-3 text-purple-400">
            <Bot className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">AI Assistant</h1>
            <p className="text-xs text-zinc-400">Powered by Retrieval Augmented Generation (RAG)</p>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex-none flex flex-wrap gap-2">
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
      <div className="flex-1 min-h-0 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 flex flex-col shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-5 pr-2 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`p-2.5 rounded-2xl text-xs font-bold shrink-0 ${m.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                {m.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className="space-y-2 max-w-2xl overflow-hidden">
                <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed prose prose-invert max-w-none ${m.sender === 'user' ? 'bg-indigo-600 text-white' : m.error ? 'bg-red-500/10 border border-red-500/30 text-red-200' : 'bg-zinc-950 border border-zinc-800 text-zinc-200'}`}>
                  {m.sender === 'ai' ? (
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  ) : (
                    m.text
                  )}
                  {m.error && (
                    <button onClick={retryLast} className="mt-3 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  )}
                </div>

                {/* Source Chips */}
                {m.sender === "ai" && m.sources && m.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {m.sources.map((src, idx) => (
                      <a href={`/dashboard/document/${src.document_id}`} target="_blank" rel="noreferrer" key={idx} className="inline-flex items-center gap-1.5 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer">
                        <FileText className="h-3 w-3 text-purple-400" />
                        <span>{src.name}</span>
                        {src.folder && <span className="text-zinc-500 ml-1">({src.folder})</span>}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-purple-400 bg-purple-500/10 p-3 rounded-xl w-fit">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex-none flex items-center gap-3 pt-4 border-t border-zinc-800 mt-4">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Ask AI Assistant about your documents, expiries, risk alerts, or vault..."
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-purple-500" 
          />
          <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl px-5 py-3 shadow-lg shadow-purple-600/30 shrink-0">
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
