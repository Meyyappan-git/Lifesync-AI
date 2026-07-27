"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeartHandshake, Shield, Sparkles, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Activity className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-12 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-8 w-8 text-indigo-500" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              LifeSync AI
            </span>
          </div>
          
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col justify-center relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Smart Health Prediction Heuristics
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Synchronize Your Wellness Predictively
          </h1>

          <p className="text-zinc-400 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
            Analyze your symptoms or upload clinical medical documents to discover future cautions and unlock personalized, actionable remedies.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-4 rounded-xl shadow-lg shadow-indigo-600/20 text-base flex items-center justify-center gap-2">
                Create Free Account <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 hover:text-white px-8 py-4 rounded-xl text-base text-zinc-300">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 w-12 h-12 rounded-xl flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Predictive Cautions</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Identify health patterns and risks early by reporting symptoms or uploading document scans.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 w-12 h-12 rounded-xl flex items-center justify-center">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Actionable Remedies</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Receive guidelines, lifestyle adjustments, and corrective preventative advice curated to your results.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 w-12 h-12 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Secure Health Ledger</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Securely register to store assessment records, tracking your cautions and history over time.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} LifeSync AI. For predictive and educational guidance only.
      </footer>
    </div>
  );
}
