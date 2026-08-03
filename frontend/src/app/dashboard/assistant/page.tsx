"use client";

import { useState } from "react";
import { Sparkles, SendHorizonal } from "lucide-react";

const starterPrompts = [
  "What expires next month?",
  "Show my travel risks",
  "Which documents are missing?",
  "What should I renew today?",
];

const assistantResponses: Record<string, string> = {
  "What expires next month?": "Your passport and insurance records should be reviewed first. Keep copies of renewal paperwork and set reminders for the upcoming month.",
  "Show my travel risks": "Travel readiness is strongest when your passport, insurance, and emergency contacts are current. Keep all three aligned in your vault.",
  "Which documents are missing?": "The biggest gaps usually appear in insurance, ID renewals, and medical contacts. Add them to your folders before the next trip.",
  "What should I renew today?": "Start with the documents that are closest to their expiration window and those tied to travel or health coverage.",
};

export default function AssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("Your AI life assistant will summarize missing documents, upcoming renewals, and travel readiness based on your uploaded records.");

  const askAssistant = () => {
    const answer = assistantResponses[prompt] || "I can help summarize your readiness. Add a few documents or ask about renewals, travel risks, or missing records.";
    setResponse(answer);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">AI Life Assistant</h1>
            <p className="text-sm text-zinc-400">Ask about upcoming deadlines, missing documents, and travel readiness.</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap gap-2">
          {starterPrompts.map((item) => (
            <button key={item} onClick={() => setPrompt(item)} className="rounded-full border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-indigo-500/30 hover:text-white">
              {item}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
          <p className="font-medium text-white">Assistant response</p>
          <p className="mt-2 text-zinc-400">{response}</p>
        </div>

        <div className="mt-6 flex gap-2">
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the assistant..." className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none ring-0" />
          <button onClick={askAssistant} className="rounded-2xl bg-indigo-600 p-3 text-white">
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
