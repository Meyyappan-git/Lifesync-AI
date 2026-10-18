"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ShieldCheck, Sparkles, Activity, ArrowRight, FolderKanban,
  AlertTriangle, Bot, Plane, FileText, CheckCircle2, ChevronRight, Zap, Lock,
  FileCheck, Calendar, RefreshCw, Cpu, Layers, Shield, Eye, Award
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (status !== "loading" && user) {
      router.push("/dashboard");
    }
  }, [user, status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <Activity className="h-10 w-10 animate-spin text-teal-700" />
      </div>
    );
  }

  const faqs = [
    {
      q: "How does the Cross-Domain Risk Correlation Engine work?",
      a: "Unlike traditional calendar reminders, LifeSync AI correlates documents across 7 distinct life folders (Vehicle, Travel, Health, Education, Employment, Finance, Property). For example, it cross-checks international flight tickets against passport expiry dates to flag entry refusal risks months in advance."
    },
    {
      q: "What document formats are supported for AI extraction?",
      a: "LifeSync AI supports PDFs, scanned images (PNG, JPEG, WEBP), and plain text documents. The OCR engine automatically parses attributes including Expiry Dates, Passport Numbers, Policy Numbers, Vehicle Numbers, and Tax IDs."
    },
    {
      q: "Is my personal document data secure?",
      a: "Yes. LifeSync AI employs end-to-end AES-256 encryption, httpOnly session security with single-flight refresh token rotation, anti-enumeration authentication, and isolated encrypted vaults for emergency medical profiles."
    },
    {
      q: "Can I explore LifeSync AI without uploading sensitive files immediately?",
      a: "Yes! You can explore the full platform using our interactive Demo Workspace in Guest Mode without needing to register or upload any private documents."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-x-hidden selection:bg-teal-500/30 selection:text-teal-700">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-teal-500/15 via-cyan-500/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 -left-48 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />

      {/* Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-teal-600 via-cyan-600 to-cyan-500 p-0.5 shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <div className="h-full w-full bg-slate-50 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-teal-700" />
              </div>
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-teal-800 via-slate-700 to-teal-700 bg-clip-text text-transparent">
              LifeSync AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#cross-domain" className="hover:text-slate-900 transition-colors">Risk Engine</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-700 hover:text-slate-900 hover:bg-white border border-slate-200/80 rounded-2xl px-5 font-semibold text-xs">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-800 hover:to-cyan-800 text-white font-semibold rounded-2xl shadow-lg shadow-teal-600/25 px-5 text-xs transition-all hover:scale-[1.02]">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-700 text-xs font-mono font-bold tracking-wider mb-8 backdrop-blur-xl animate-in fade-in duration-500">
          <Sparkles className="h-4 w-4 text-teal-700 animate-pulse" />
          NEXT-GEN CROSS-DOMAIN CORRELATION ENGINE 2.0
        </div>

        <h1 className="text-4xl sm:text-7xl font-black tracking-tight leading-[1.08] max-w-5xl mx-auto bg-gradient-to-b from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent">
          Your Intelligent Life Operating System & Risk Radar
        </h1>

        <p className="mt-8 text-slate-600 text-lg sm:text-2xl leading-relaxed max-w-3xl mx-auto font-light">
          Automatically extract data from documents, organize records into 7 Smart Life Folders, correlate hidden cross-folder risks, and query your vault with AI.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="w-full bg-teal-700 hover:bg-teal-600 text-white font-semibold px-8 py-6 rounded-2xl shadow-xl shadow-teal-600/30 text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
              Launch Platform <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/dashboard?guest=1" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full border-slate-200 bg-white/80 hover:bg-slate-100 text-slate-800 px-8 py-6 rounded-2xl text-base backdrop-blur-xl transition-all hover:scale-[1.02]">
              Explore Demo Workspace
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Pills */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 font-mono">
          <span className="px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-700" /> Multimodal OCR
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-700" /> RAG Assistant
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-700" /> AES-256 Vault
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> Instant Expiry Alerts
          </span>
        </div>

        {/* Interactive UI Dashboard Preview Frame */}
        <div className="mt-16 relative mx-auto max-w-6xl rounded-3xl border border-slate-200/90 bg-white/60 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl shadow-teal-950/40">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 text-left space-y-6">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-500 ml-2">https://app.lifesync.ai/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
                <Activity className="h-3.5 w-3.5" /> Life Health Score: 92/100
              </div>
            </div>

            {/* Dashboard Cards Grid Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-red-50/30 border border-red-200/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-700 border border-red-500/30">CRITICAL RISK</span>
                  <span className="text-[10px] font-mono text-slate-500">Travel Folder</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">Passport Expiring Before Flight</h4>
                <p className="text-xs text-slate-600">Flight ticket booked for Sept 25, but Passport expires in 45 days.</p>
              </div>

              <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-700 border border-teal-500/30">SMART FOLDER</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">85% Complete</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">Vehicle Documents</h4>
                <p className="text-xs text-slate-600">Driving Licence & Insurance active. Missing: PUC Certificate.</p>
              </div>

              <div className="p-5 rounded-2xl bg-white/90 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-700 border border-cyan-500/30">AI RAG ASSISTANT</span>
                  <Bot className="h-3.5 w-3.5 text-cyan-700" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1">&quot;What is my CGPA?&quot;</h4>
                <p className="text-xs text-slate-600">&quot;Your CGPA is **8.23** as extracted from your Degree Transcript.&quot;</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Innovation: Cross-Domain Engine */}
      <section id="cross-domain" className="py-24 bg-white/40 border-y border-slate-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-mono font-bold text-teal-700 tracking-widest uppercase bg-teal-500/10 px-3.5 py-1.5 rounded-full border border-teal-500/20">
              CORE INNOVATION
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Cross-Domain Risk Correlation Engine</h2>
            <p className="text-slate-600 text-lg font-light">
              Traditional apps only send basic date reminders. LifeSync AI correlates across 7 life folders to surface compound risks human oversight misses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-red-200/60 hover:border-red-500/40 transition-all space-y-5 shadow-2xl group">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1 rounded-lg text-xs font-mono font-black bg-red-500/20 text-red-700 border border-red-500/30 uppercase tracking-wider">CRITICAL RISK</span>
                <span className="text-xs font-mono text-slate-500">Travel + Passport</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-700 transition-colors">Flight Booked + Passport Expiring &lt; 6 Months</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Detected international flight confirmation in Travel Folder, but Passport expires within 6 months. Most airlines and countries deny boarding and entry.
              </p>
              <div className="pt-3 border-t border-slate-200 text-xs font-medium text-teal-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Recommended Action: Renew Passport via Passport Seva / Embassy immediately
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-amber-200/60 hover:border-amber-500/40 transition-all space-y-5 shadow-2xl group">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1 rounded-lg text-xs font-mono font-black bg-amber-500/20 text-amber-700 border border-amber-500/30 uppercase tracking-wider">HIGH RISK</span>
                <span className="text-xs font-mono text-slate-500">Vehicle + Licence</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-700 transition-colors">Expired DL + Active Vehicle Registration</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Driving Licence expired while owning an active vehicle registration. Operating a vehicle with an expired DL invalidates motor insurance coverage completely.
              </p>
              <div className="pt-3 border-t border-slate-200 text-xs font-medium text-teal-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Recommended Action: Apply for RTO Licence Renewal immediately
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7 Smart Life Folders */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-mono font-bold text-cyan-700 tracking-widest uppercase bg-cyan-500/10 px-3.5 py-1.5 rounded-full border border-cyan-500/20">
            SMART FOLDERS
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">7 Smart Life Domains</h2>
          <p className="text-slate-600 text-lg font-light">
            Zero manual tagging needed. Upload your document and LifeSync AI automatically categorizes and extracts key expiry attributes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Vehicle Folder", desc: "Driving Licence, RC Book, Insurance, PUC Certificate, Road Tax", icon: Zap, color: "text-amber-700" },
            { title: "Travel Folder", desc: "Passport, Visa, Flight Tickets, Hotel Confirmation, Travel Insurance", icon: Plane, color: "text-cyan-700" },
            { title: "Health Folder", desc: "Medical Reports, Prescriptions, Health Policy, Vaccination Cards", icon: Activity, color: "text-emerald-700" },
            { title: "Education Folder", desc: "Degree Certificates, Mark Sheets, Academic Transcripts", icon: FileText, color: "text-teal-700" },
            { title: "Employment Folder", desc: "Offer Letter, Salary Slips, Experience Certificates, Contracts", icon: Shield, color: "text-cyan-700" },
            { title: "Finance Folder", desc: "PAN Card, Bank Statements, Tax Returns (ITR), Loans, Investments", icon: Sparkles, color: "text-teal-700" },
            { title: "Property Folder", desc: "Sale Deeds, Property Tax Receipts, Utility Bills, Lease Agreements", icon: FolderKanban, color: "text-rose-700" },
            { title: "Emergency Vault", desc: "Blood Group, Medical Conditions, Primary & Trusted Contacts", icon: Lock, color: "text-red-700" },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-3xl bg-white/60 border border-slate-200/80 hover:border-teal-500/40 transition-all space-y-3 shadow-xl backdrop-blur-xl group">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 w-fit group-hover:scale-110 transition-transform">
                <f.icon className={`h-6 w-6 ${f.color}`} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{f.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white/40 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Transparent Pricing</h2>
            <p className="text-slate-600 text-lg font-light">Start free, upgrade as your document vault and risk correlation needs scale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-xl">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Starter</h3>
                <p className="text-4xl font-extrabold text-slate-900 mt-4">$0 <span className="text-sm font-normal text-slate-500">/mo</span></p>
                <ul className="mt-8 space-y-3.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" /> Up to 25 Documents</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" /> 7 Smart Life Folders</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" /> Basic Expiry Alerts</li>
                </ul>
              </div>
              <Link href="/register" className="mt-8">
                <Button className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl py-6 font-semibold">Get Started Free</Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-teal-50/60 to-slate-50 border-2 border-teal-500 flex flex-col justify-between relative shadow-2xl shadow-teal-950/60">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-mono font-bold bg-teal-700 text-white uppercase tracking-wider shadow-lg">
                MOST POPULAR
              </span>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Pro LifeSync</h3>
                <p className="text-4xl font-extrabold text-slate-900 mt-4">$12 <span className="text-sm font-normal text-slate-600">/mo</span></p>
                <ul className="mt-8 space-y-3.5 text-sm text-slate-800">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" /> Unlimited Documents & Multimodal OCR</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" /> Cross-Domain Risk Correlation Engine</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" /> Context-Aware RAG Life Assistant</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" /> AI Travel Readiness Checker</li>
                </ul>
              </div>
              <Link href="/register" className="mt-8">
                <Button className="w-full bg-teal-700 hover:bg-teal-600 text-white font-semibold rounded-2xl py-6 shadow-lg shadow-teal-600/30">Start 14-Day Trial</Button>
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-xl">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Family / Vault</h3>
                <p className="text-4xl font-extrabold text-slate-900 mt-4">$29 <span className="text-sm font-normal text-slate-500">/mo</span></p>
                <ul className="mt-8 space-y-3.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" /> Multi-User Family Vault</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" /> Admin Directory & Security Metrics</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" /> Priority OCR & Storage Processing</li>
                </ul>
              </div>
              <Link href="/register" className="mt-8">
                <Button className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl py-6 font-semibold">Contact Sales</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-2xl bg-white/60 border border-slate-200 overflow-hidden backdrop-blur-xl">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-6 text-left font-bold text-lg text-slate-900 flex items-center justify-between gap-4"
              >
                <span>{f.q}</span>
                <ChevronRight className={`h-5 w-5 text-teal-700 transition-transform duration-200 ${openFaq === i ? "rotate-90" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-4">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-teal-700" />
            <span className="font-bold text-sm text-slate-700">LifeSync AI Platform</span>
          </div>
          <p>© {new Date().getFullYear()} LifeSync AI Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
