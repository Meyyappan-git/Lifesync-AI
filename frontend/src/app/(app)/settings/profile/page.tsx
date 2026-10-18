"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { User, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { updateMeApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";

export default function ProfileSettingsPage() {
  const { user, refetchUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      full_name: user?.full_name || "",
    },
  });

  const onSubmit = async (data: { full_name: string }) => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateMeApi(data.full_name);
      await refetchUser();
      setSuccessMsg("Profile updated successfully.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profile Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your personal account details and profile information.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Email (Read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-600">
              Email address (Read-only)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ""}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500">
              Your email address cannot be changed directly for security reasons.
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="full_name"
              type="text"
              disabled={saving}
              {...register("full_name", { required: "Full name is required" })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {errors.full_name && (
              <p className="text-xs text-red-700">{errors.full_name.message as string}</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </div>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
