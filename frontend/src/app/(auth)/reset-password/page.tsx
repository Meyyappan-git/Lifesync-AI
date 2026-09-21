"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validation/auth";
import { resetPasswordApi } from "@/lib/api/auth";
import { ApiError } from "@/types/auth";
import { Button } from "@/components/ui/button";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setGlobalError(null);
    try {
      await resetPasswordApi({ ...data, token: token || data.token });
      setSuccess(true);
    } catch (err: any) {
      const apiErr = err as ApiError;
      if (apiErr.fields) {
        Object.entries(apiErr.fields).forEach(([field, msg]) => {
          setError(field as keyof ResetPasswordInput, { type: "server", message: msg });
        });
      }
      setGlobalError(apiErr.message || "Password reset failed. Link may be invalid or expired.");
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Set new password</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Please choose a strong new password for your account.
        </p>
      </div>

      {success ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Password reset complete</h2>
          <p className="text-sm text-zinc-400">
            Your password has been updated. All existing sessions have been signed out for security.
          </p>
          <Link href="/login">
            <Button className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Sign in with new password
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {globalError && (
            <div role="alert" aria-live="polite" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <input type="hidden" {...register("token")} value={token} />

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={isSubmitting}
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

            <div className="space-y-2">
              <label htmlFor="confirm_password" className="block text-sm font-medium text-zinc-300">
                Confirm new password
              </label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...register("confirm_password")}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                placeholder="••••••••••••"
              />
              {errors.confirm_password && (
                <p className="text-xs text-red-400" role="alert">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating password…
                </div>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 font-sans text-zinc-100">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
