"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

import { loginSchema, LoginInput } from "@/lib/validation/auth";
import { loginApi, resendVerificationApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";
import { validateSameOriginRedirect } from "@/lib/api/client";
import { ApiError } from "@/types/auth";
import { Button } from "@/components/ui/button";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const { loginSuccess } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember_me: true,
    },
  });

  useEffect(() => {
    if (lockoutTimer === null || lockoutTimer <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimer((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimer]);

  const onSubmit = async (data: LoginInput) => {
    setGlobalError(null);
    setShowResend(false);
    setResendStatus(null);

    try {
      const res = await loginApi(data);
      loginSuccess(res);
      const targetUrl = validateSameOriginRedirect(nextParam);
      router.push(targetUrl);
    } catch (err: any) {
      const apiErr = err as ApiError;
      if (apiErr.fields) {
        Object.entries(apiErr.fields).forEach(([field, msg]) => {
          setError(field as keyof LoginInput, { type: "server", message: msg });
        });
      }

      if (apiErr.code === "email_not_verified") {
        setShowResend(true);
      } else if (apiErr.code === "account_locked" && apiErr.retryAfter) {
        setLockoutTimer(apiErr.retryAfter);
      }

      setGlobalError(apiErr.message || "Failed to sign in. Please try again.");
    }
  };

  const handleResend = async () => {
    const email = getValues("email");
    if (!email) return;
    try {
      await resendVerificationApi(email);
      setResendStatus("Verification email sent! Check your inbox.");
    } catch {
      setResendStatus("Failed to resend email. Please try again.");
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
      <div className="mx-auto w-full max-w-md space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to your account</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Enter your credentials to access your LifeSync AI workspace.
          </p>
        </div>

        {globalError && (
          <div role="alert" aria-live="polite" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{globalError}</span>
            </div>

            {showResend && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-xs font-semibold text-blue-400 hover:underline"
                >
                  Click here to resend verification email →
                </button>
              </div>
            )}

            {lockoutTimer !== null && (
              <p className="text-xs font-mono text-red-300">
                Account locked. Try again in {lockoutTimer} seconds.
              </p>
            )}
          </div>
        )}

        {resendStatus && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            {resendStatus}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isSubmitting || lockoutTimer !== null}
              {...register("email")}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              placeholder="name@example.com"
            />
            {errors.email && (
              <p className="text-xs text-red-400" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isSubmitting || lockoutTimer !== null}
                {...register("password")}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-4 pr-11 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-400">
              <input
                type="checkbox"
                {...register("remember_me")}
                className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-blue-500"
              />
              <span>Remember me for 30 days</span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || lockoutTimer !== null}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </div>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-blue-400 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-zinc-950 font-sans text-zinc-100">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-zinc-900 border-r border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2.5 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">LifeSync AI</span>
        </div>

        <div className="space-y-6 max-w-lg">
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Autonomous life operating system for secure document & risk management.
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Organize critical passports, driving licences, health insurance, and vehicle records with AI multimodal OCR and proactive cross-domain compliance alerts.
          </p>
        </div>

        <p className="text-xs text-zinc-500">
          © {new Date().getFullYear()} LifeSync AI. All rights reserved.
        </p>
      </div>

      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-blue-500 m-auto" />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
