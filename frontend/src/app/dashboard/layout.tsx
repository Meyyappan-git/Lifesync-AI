"use client";

import Link from "next/link";
import { HeartHandshake, LayoutDashboard, FolderKanban, ShieldAlert, Sparkles, LogOut, BrainCircuit, ShieldCheck, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950/90 p-6">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-7 w-7 text-indigo-500" />
            <span className="text-lg font-semibold">LifeSync AI</span>
          </div>

          <nav className="mt-8 space-y-2">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-xl bg-zinc-900 px-3 py-3 text-sm font-medium text-white">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link href="/dashboard/folders" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
              <FolderKanban className="h-4 w-4" /> Smart Folders
            </Link>
            <Link href="/dashboard/alerts" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
              <ShieldAlert className="h-4 w-4" /> Risk Alerts
            </Link>
            <Link href="/dashboard/assistant" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
              <Sparkles className="h-4 w-4" /> AI Assistant
            </Link>
            <Link href="/dashboard/insights" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
              <BrainCircuit className="h-4 w-4" /> Insights
            </Link>
            <Link href="/dashboard/emergency" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
              <ShieldCheck className="h-4 w-4" /> Emergency Vault
            </Link>
            <Link href="/dashboard/admin" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
              <Shield className="h-4 w-4" /> Admin Center
            </Link>
          </nav>

          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
            {user ? (
              <>
                <p className="font-medium text-zinc-200">Signed in as</p>
                <p className="mt-1 text-white">{user.email}</p>
                <button onClick={() => logout()} className="mt-4 flex items-center gap-2 text-rose-400">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            ) : (
              <>
                <p className="font-medium text-zinc-200">Guest preview mode</p>
                <p className="mt-1 text-white">Explore the dashboard without logging in.</p>
                <div className="mt-4 space-x-2">
                  <Link href="/login" className="text-sm text-indigo-300 hover:text-indigo-200">
                    Sign in
                  </Link>
                  <Link href="/register" className="text-sm text-indigo-300 hover:text-indigo-200">
                    Register
                  </Link>
                </div>
              </>
            )}
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
