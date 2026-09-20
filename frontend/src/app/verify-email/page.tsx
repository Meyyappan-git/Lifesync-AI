"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("A verification token is missing.");
        return;
      }

      try {
        const data = await apiClient.get<{ message: string }>(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`);
        setStatus("success");
        setMessage(data.message);
        setTimeout(() => router.push("/login"), 1200);
      } catch (err) {
        setStatus("error");
        if (err instanceof ApiError) {
          setMessage(err.data?.detail || "Verification failed");
        } else {
          setMessage("Verification failed");
        }
      }
    };

    verify();
  }, [router, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-gray-200 dark:bg-zinc-900 dark:ring-white/10">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Email verification</h2>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{message || "Verifying your email, please wait..."}</p>

        {status === "success" ? (
          <div className="mt-6">
            <Button onClick={() => router.push("/login")} className="w-full">Continue to login</Button>
          </div>
        ) : status === "error" ? (
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => router.push("/register")} className="w-full">Try again</Button>
            <Link href="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">Back to login</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm p-4">Loading Verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
