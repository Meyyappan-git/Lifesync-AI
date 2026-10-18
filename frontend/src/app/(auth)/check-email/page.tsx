"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { resendVerificationApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResending(true);
    setResendStatus(null);
    try {
      await resendVerificationApi(email);
      setResendStatus("A new verification link has been sent to your email!");
      setCooldown(60);
    } catch {
      setResendStatus("Failed to send verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-700/10 text-teal-700 border border-teal-500/20">
        <Mail className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Check your email</h1>
        <p className="text-sm text-slate-600">
          We sent a verification link to{" "}
          <span className="font-medium text-slate-900">{email || "your email address"}</span>.
          Please click the link in that email to activate your account.
        </p>
      </div>

      {resendStatus && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-700">
          {resendStatus}
        </div>
      )}

      <div className="pt-2 space-y-3">
        <Button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending || !email}
          variant="outline"
          className="w-full rounded-xl border-slate-200 bg-white py-3 text-sm text-slate-800 hover:bg-slate-100 disabled:opacity-50"
        >
          {resending ? (
            <div className="flex items-center gap-2 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Resending…
            </div>
          ) : cooldown > 0 ? (
            `Resend email in ${cooldown}s`
          ) : (
            "Resend verification email"
          )}
        </Button>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-6 font-sans text-slate-900">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-teal-700 mx-auto" />}>
        <CheckEmailContent />
      </Suspense>
    </div>
  );
}
