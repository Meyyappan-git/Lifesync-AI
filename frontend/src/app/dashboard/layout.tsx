"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  HeartHandshake, LayoutDashboard, FolderKanban, ShieldAlert, Sparkles, 
  LogOut, Plane, ShieldCheck, Bot, Flame, Settings
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

import { Suspense } from "react";

function SidebarNav() {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const guestMode = searchParams.get("guest") === "1";
  const guestQuery = guestMode ? "?guest=1" : "";

  const navItems = [
    { label: "Dashboard", href: `/dashboard${guestQuery}`, icon: LayoutDashboard },
    { label: "7 Smart Folders", href: `/dashboard/folders${guestQuery}`, icon: FolderKanban },
    { label: "Risk Engine", href: `/dashboard/risk-engine${guestQuery}`, icon: ShieldAlert },
    { label: "AI RAG Assistant", href: `/dashboard/assistant${guestQuery}`, icon: Bot },
    { label: "Travel Checker", href: `/dashboard/travel-checker${guestQuery}`, icon: Plane },
    { label: "Emergency Vault", href: `/dashboard/vault${guestQuery}`, icon: ShieldCheck },
  ];

  return (
    <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-sidebar p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary p-0.5 shadow-lg shadow-primary/20">
            <div className="h-full w-full bg-sidebar rounded-[10px] flex items-center justify-center">
              <HeartHandshake className="h-4 w-4 text-accent" />
            </div>
          </div>
          <span className="text-lg font-extrabold text-sidebar-foreground">
            LifeSync <span className="text-accent">AI</span>
          </span>
        </div>

        <nav className="mt-8 space-y-1.5">
          {navItems.map((item, i) => {
            const isActive = pathname === item.href.split("?")[0];
            return (
              <Link 
                key={i} 
                href={item.href} 
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-xs text-zinc-400 space-y-2">
        {user ? (
          <>
            <p className="font-bold text-zinc-200">Signed in as</p>
            <p className="text-white truncate">{user.email}</p>
            <Link href="/dashboard/settings" className="mt-3 flex items-center gap-2 text-indigo-400 font-bold hover:text-indigo-300">
              <Settings className="h-3.5 w-3.5" /> Account Settings
            </Link>
            <button onClick={() => logout()} className="mt-3 flex items-center gap-2 text-rose-400 font-bold hover:text-rose-300">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </>
        ) : (
          <>
            <p className="font-bold text-zinc-200">Guest Preview Mode</p>
            <p className="text-zinc-400">All 7 folders and risk engines unlocked.</p>
            <div className="mt-3 flex gap-3 font-bold text-indigo-400">
              <Link href="/login" className="hover:underline">Sign in</Link>
              <Link href="/register" className="hover:underline">Register</Link>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Suspense fallback={<div className="w-full lg:w-72 p-6 text-xs text-zinc-500">Loading Navigation...</div>}>
          <SidebarNav />
        </Suspense>

        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
