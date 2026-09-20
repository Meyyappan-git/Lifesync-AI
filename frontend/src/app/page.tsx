"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HeartHandshake, Shield, Sparkles, Activity, ArrowRight, FolderKanban,
  AlertTriangle, Bot, Plane, FileText, CheckCircle2, ChevronRight, Zap, Lock
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const faqs = [
    {
      q: "How does the Cross-Domain Risk Correlation Engine work?",
      a: "Unlike simple calendar apps, LifeSync AI correlates documents across 7 life folders (Vehicle, Travel, Health, Education, Employment, Finance, Property). For example, it detects if your Passport expires within 6 months while an international Flight Ticket is booked, generating a Critical Alert."
    },
    {
      q: "What document formats are supported for AI extraction?",
      a: "LifeSync AI supports PDF, Images (JPEG/PNG), and DOCX files. OCR automatically extracts Expiry Dates, Passport Numbers, Policy Numbers, Vehicle Numbers, PAN/Aadhaar IDs, and names."
    },
    {
      q: "Are my sensitive documents secure?",
      a: "Yes. LifeSync AI uses AES-256 encrypted storage, strict JWT session management, role-based access controls, and an isolated encrypted Emergency Vault for critical medical and contact data."
    },
    {
      q: "Can I use LifeSync AI without uploading files initially?",
      a: "Absolutely. You can start by continuing as a Guest or creating an account, manually logging key details, or using the RAG Life Assistant."
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="h-full w-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <HeartHandshake className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              LifeSync AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#cross-domain" className="hover:text-white transition-colors">Risk Engine</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800/60 rounded-xl">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-8 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
          <span>Next-Gen Cross-Domain Intelligence Engine</span>
        </div>

        <h1 className="text-4xl sm:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Intelligent Life Management & Cross-Domain Risk Correlation
        </h1>

        <p className="mt-8 text-zinc-400 text-lg sm:text-2xl leading-relaxed max-w-3xl mx-auto font-light">
          Automatically extract data from documents, auto-organize into 7 Smart Life Folders, predict hidden cross-folder risks, and receive proactive preventive recommendations before deadlines expire.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-6 rounded-2xl shadow-xl shadow-indigo-600/30 text-base flex items-center justify-center gap-2">
              Launch Platform <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/dashboard?guest=1" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 px-8 py-6 rounded-2xl text-base backdrop-blur-md">
              Explore Demo Workspace
            </Button>
          </Link>
        </div>

        {/* Dashboard Preview Banner */}
        <div className="mt-16 relative mx-auto max-w-5xl rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-2xl shadow-2xl shadow-indigo-950/50">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-zinc-400 font-mono ml-2">lifesync.app/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <Activity className="h-3.5 w-3.5" /> Life Health Score: 92/100
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-200 uppercase tracking-wider">Critical Risk Correlation</h4>
                  <p className="text-xs text-red-300/80 mt-1">Flight Ticket booked + Passport expires within 6 months.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start gap-3">
                <FolderKanban className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Vehicle Folder</h4>
                  <p className="text-xs text-zinc-400 mt-1">Completion: 85% • Missing PUC Certificate</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start gap-3">
                <Bot className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">AI Life Assistant</h4>
                  <p className="text-xs text-zinc-400 mt-1">&quot;What documents expire next month?&quot;</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Innovation: Cross-Domain Engine */}
      <section id="cross-domain" className="py-24 bg-zinc-900/40 border-y border-zinc-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-semibold text-indigo-400 tracking-widest uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Core Innovation
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Cross-Domain Risk Correlation Engine</h2>
            <p className="text-zinc-400 text-lg">
              Ordinary apps send basic calendar reminders. LifeSync AI correlates across 7 distinct life folders to detect compound risks human oversight misses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-zinc-950 border border-red-900/30 hover:border-red-500/50 transition-all space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL ALERT</span>
                <span className="text-xs text-zinc-500 font-mono">Travel + Health Folder</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-100">Hotel Booking + Visa Missing</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Detected international hotel reservation in Travel Folder, but no valid Visa document is present. Risk of booking cancellation and entry refusal.
              </p>
              <div className="pt-2 text-xs font-medium text-indigo-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Action: Apply for E-Visa or upload existing copy
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-zinc-950 border border-amber-900/30 hover:border-amber-500/50 transition-all space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH RISK</span>
                <span className="text-xs text-zinc-500 font-mono">Vehicle + Employment</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-100">Expired DL + Active Vehicle Ownership</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Driving Licence expired while owning an active vehicle. Driving without valid DL voids motor insurance coverage completely.
              </p>
              <div className="pt-2 text-xs font-medium text-indigo-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Action: Initiate RTO Licence Renewal immediately
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Life Folders */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">7 AI Smart Life Folders</h2>
          <p className="text-zinc-400 text-lg">
            No manual folder creation needed. LifeSync AI automatically categorizes uploads and tracks folder completeness.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Vehicle Folder", desc: "Driving Licence, RC Book, Vehicle Insurance, PUC, Road Tax", icon: Zap, color: "text-amber-400" },
            { title: "Travel Folder", desc: "Passport, Visa, Flight Tickets, Hotel Bookings, Travel Insurance", icon: Plane, color: "text-cyan-400" },
            { title: "Health Folder", desc: "Medical Reports, Prescriptions, Health Insurance, Vaccinations", icon: Activity, color: "text-emerald-400" },
            { title: "Education Folder", desc: "Degree Certificates, Mark Sheets, Transfer Certificates", icon: FileText, color: "text-blue-400" },
            { title: "Employment Folder", desc: "Offer Letter, Salary Slips, Experience Certificates, Contracts", icon: Shield, color: "text-purple-400" },
            { title: "Finance Folder", desc: "PAN Card, Bank Statements, Tax Returns, Loans, Investments", icon: Sparkles, color: "text-indigo-400" },
            { title: "Property Folder", desc: "Sale Deeds, Property Tax Receipts, Utility Bills, Lease Agreements", icon: FolderKanban, color: "text-rose-400" },
            { title: "Emergency Vault", desc: "Encrypted Blood Group, Allergy History, Contacts, Medical Emergency", icon: Lock, color: "text-red-400" },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3">
              <f.icon className={`h-8 w-8 ${f.color}`} />
              <h3 className="text-lg font-bold text-white">{f.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-zinc-900/40 border-t border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Simple, Transparent Pricing</h2>
            <p className="text-zinc-400 text-lg">Start free, upgrade as your document and risk correlation needs grow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Starter</h3>
                <p className="text-3xl font-extrabold text-white mt-4">$0 <span className="text-sm font-normal text-zinc-500">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Up to 25 Documents</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Smart Folders</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Basic Expiry Alerts</li>
                </ul>
              </div>
              <Link href="/register" className="mt-8">
                <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl">Get Started</Button>
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-950/60 to-zinc-950 border-2 border-indigo-500 flex flex-col justify-between relative shadow-2xl shadow-indigo-950/50">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-extrabold bg-indigo-500 text-white uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <h3 className="text-xl font-bold text-white">Pro LifeSync</h3>
                <p className="text-3xl font-extrabold text-white mt-4">$12 <span className="text-sm font-normal text-zinc-500">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Unlimited Documents & OCR</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Cross-Domain Risk Correlation Engine</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> RAG Life Assistant</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> AI Travel Readiness Checker</li>
                </ul>
              </div>
              <Link href="/register" className="mt-8">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30">Start 14-Day Free Trial</Button>
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Enterprise / Family</h3>
                <p className="text-3xl font-extrabold text-white mt-4">$29 <span className="text-sm font-normal text-zinc-500">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Multi-User Family Vault</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Dedicated Admin Analytics</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Priority API & Storage</li>
                </ul>
              </div>
              <Link href="/register" className="mt-8">
                <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl">Contact Sales</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-6 text-left font-bold text-lg text-white flex items-center justify-between gap-4"
              >
                <span>{f.q}</span>
                <ChevronRight className={`h-5 w-5 text-indigo-400 transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-4">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-indigo-500" />
            <span className="font-bold text-sm text-zinc-300">LifeSync AI Platform</span>
          </div>
          <p>© {new Date().getFullYear()} LifeSync AI Inc. Production-Ready Platform.</p>
        </div>
      </footer>
    </div>
  );
}
