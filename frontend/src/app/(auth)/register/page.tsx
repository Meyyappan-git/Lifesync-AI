"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, AlertCircle, Check, X, ShieldCheck } from "lucide-react";

import { registerSchema, RegisterInput } from "@/lib/validation/auth";
import { registerApi } from "@/lib/api/auth";
import { ApiError } from "@/types/auth";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  const watchPassword = watch("password", "");
  const watchEmail = watch("email", "");

  // Password Policy Rule Checklist Checks
  const hasMinLength = watchPassword.length >= 10 && watchPassword.length <= 72;
  const hasLetter = /[a-zA-Z]/.test(watchPassword);
  const hasNumber = /[0-9]/.test(watchPassword);
  const emailPrefix = watchEmail.includes("@") ? watchEmail.split("@")[0].toLowerCase() : "";
  const noEmailInPassword = emailPrefix.length >= 3 ? !watchPassword.toLowerCase().includes(emailPrefix) : true;

  const rulesPassedCount = [hasMinLength, hasLetter, hasNumber, noEmailInPassword].filter(Boolean).length;
  const strengthPercentage = (rulesPassedCount / 4) * 100;

  const onSubmit = async (data: RegisterInput) => {
    setGlobalError(null);
    try {
      await registerApi(data);
      router.push(`/login`);
    } catch (err: any) {
      const apiErr = err as ApiError;
      if (apiErr.fields) {
        Object.entries(apiErr.fields).forEach(([field, msg]) => {
          setError(field as keyof RegisterInput, { type: "server", message: msg });
        });
      }
      setGlobalError(apiErr.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-zinc-950 font-sans text-zinc-100">
      {/* Desktop Left Banner */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-zinc-900 border-r border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-2.5 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">LifeSync AI</span>
        </div>

        <div className="space-y-6 max-w-lg">
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Create your account to start managing life operations.
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Securely index passports, insurance policies, tax filings, and emergency profiles with privacy-first encryption.
          </p>
        </div>

        <p className="text-xs text-zinc-500">
          © {new Date().getFullYear()} LifeSync AI. All rights reserved.
        </p>
      </div>

      {/* Form Container Right Side */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create an account</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Get started with LifeSync AI life management.
            </p>
          </div>

          {globalError && (
            <div role="alert" aria-live="polite" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="full_name" className="block text-sm font-medium text-zinc-300">
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                disabled={isSubmitting}
                {...register("full_name")}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="text-xs text-red-400" role="alert">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
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

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Password
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

              {/* Strength Meter Bar */}
              {watchPassword && (
                <div className="space-y-2 pt-1">
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strengthPercentage < 50
                          ? "bg-red-500"
                          : strengthPercentage < 100
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${strengthPercentage}%` }}
                    />
                  </div>

                  {/* Rule Checklist */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : "text-zinc-500"}`}>
                      {hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} 10-72 characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetter ? "text-emerald-400" : "text-zinc-500"}`}>
                      {hasLetter ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} At least 1 letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-400" : "text-zinc-500"}`}>
                      {hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} At least 1 number
                    </div>
                    <div className={`flex items-center gap-1.5 ${noEmailInPassword ? "text-emerald-400" : "text-zinc-500"}`}>
                      {noEmailInPassword ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} No email username
                    </div>
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-red-400" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirm_password" className="block text-sm font-medium text-zinc-300">
                Confirm password
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
                </div>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
