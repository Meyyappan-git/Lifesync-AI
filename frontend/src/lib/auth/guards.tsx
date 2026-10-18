"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-context";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      const nextUrl = encodeURIComponent(pathname);
      router.push(`/login?next=${nextUrl}`);
    }
  }, [status, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
          <p className="text-sm font-medium">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}

interface RequireRoleProps {
  roles: ("user" | "admin")[];
  children: React.ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, status } = useAuth();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex h-64 w-full items-center justify-center text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
      </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-red-500/10 p-4 text-red-700 border border-red-500/20 mb-4">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">403 - Access Forbidden</h1>
        <p className="text-sm text-slate-600 max-w-md mb-6">
          You do not have administrative privileges to access this area.
        </p>
        <Button onClick={() => router.push("/dashboard")} variant="outline" className="rounded-xl border-slate-200">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
