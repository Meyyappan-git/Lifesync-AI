"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/validation/auth";
import { forgotPasswordApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await forgotPasswordApi(data);
    } catch {
      // Always show generic success message (anti-enumeration)
    } finally {
      setSubmitted(true);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 font-sans text-zinc-100">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset password</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm text-zinc-300">
              If an account exists with that email, a password reset link has been sent. Please check your inbox.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full rounded-xl border-zinc-800 bg-zinc-950 text-zinc-200">
                Return to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                disabled={isSubmitting}
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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending link…
                </div>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
