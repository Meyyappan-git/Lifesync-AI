"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await apiClient.post("/api/v1/auth/forgot-password", { email });
      setMessage("If that email exists, a reset link has been sent.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.detail || "Unable to process your request");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200 dark:bg-zinc-900 dark:ring-white/10">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Reset your password</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter your email and we’ll send a recovery link.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {message && <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
