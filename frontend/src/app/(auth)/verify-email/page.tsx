"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { verifyEmailApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMessage("No verification token was provided in the URL.");
      return;
    }

    verifyEmailApi(token)
      .then(() => {
        setSuccess(true);
      })
      .catch((err) => {
        setErrorMessage(err.message || "Verification link is invalid or has expired.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="w-full max-w-md text-center space-y-6">
      {loading ? (
        <div className="space-y-4">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-500" />
          <h1 className="text-xl font-bold text-white">Verifying your email address…</h1>
          <p className="text-sm text-zinc-400">Please wait while we confirm your account token.</p>
        </div>
      ) : success ? (
        <div className="space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Email verified!</h1>
            <p className="text-sm text-zinc-400">
              Your email address has been successfully confirmed. You can now sign in to LifeSync AI.
            </p>
          </div>

          <Link href="/login">
            <Button className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Sign in to your account
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Verification failed</h1>
            <p className="text-sm text-red-400 font-medium">{errorMessage}</p>
          </div>

          <div className="pt-2 space-y-3">
            <Link href="/login">
              <Button className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">
                Return to sign in
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 font-sans text-zinc-100">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
