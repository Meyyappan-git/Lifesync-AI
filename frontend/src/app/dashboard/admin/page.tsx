"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export default function AdminPage() {
  const [stats] = useState({
    users: 1,
    alerts: 0,
    folders: 7,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Admin Center</h1>
            <p className="text-sm text-zinc-400">Operations overview for the LifeSync platform.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Registered users</p>
          <p className="mt-3 text-3xl font-semibold text-white">{stats.users}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Active alerts</p>
          <p className="mt-3 text-3xl font-semibold text-white">{stats.alerts}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Default folders</p>
          <p className="mt-3 text-3xl font-semibold text-white">{stats.folders}</p>
        </div>
      </div>
    </div>
  );
}
