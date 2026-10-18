"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Key, Laptop, LogOut, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

import { changePasswordSchema, ChangePasswordInput } from "@/lib/validation/auth";
import { changePasswordApi, getMySessionsApi, revokeMySessionApi, getMyActivityApi, logoutAllApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthSession, ActivityLog, ApiError } from "@/types/auth";
import { Button } from "@/components/ui/button";

export default function SecuritySettingsPage() {
  const { logoutAll } = useAuth();

  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
    },
  });

  const fetchSecurityData = async () => {
    try {
      const [sessData, actData] = await Promise.all([getMySessionsApi(), getMyActivityApi(1, 10)]);
      setSessions(sessData);
      setActivities(actData.items);
    } catch {
      // Ignored
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const onChangePassword = async (data: ChangePasswordInput) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      await changePasswordApi(data);
      setPasswordSuccess("Password changed successfully. All other active sessions signed out.");
      reset();
      fetchSecurityData();
    } catch (err: any) {
      const apiErr = err as ApiError;
      if (apiErr.fields) {
        Object.entries(apiErr.fields).forEach(([field, msg]) => {
          setError(field as keyof ChangePasswordInput, { type: "server", message: msg });
        });
      }
      setPasswordError(apiErr.message || "Failed to change password.");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeMySessionApi(sessionId);
      fetchSecurityData();
    } catch {
      // Ignored
    }
  };

  const handleSignOutEverywhere = async () => {
    if (confirm("Are you sure you want to sign out from all devices?")) {
      await logoutAll();
    }
  };

  return (
    <div className="max-w-4xl space-y-10 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Sessions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your password, active login sessions, and audit security events.
        </p>
      </div>

      {/* 1. Change Password */}
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Key className="h-5 w-5 text-teal-700" /> Change Password
        </h2>

        {passwordSuccess && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 max-w-md" noValidate>
          <div className="space-y-2">
            <label htmlFor="current_password" className="block text-sm font-medium text-slate-700">
              Current password
            </label>
            <input
              id="current_password"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              {...register("current_password")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {errors.current_password && (
              <p className="text-xs text-red-700">{errors.current_password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="new_password" className="block text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              disabled={isSubmitting}
              {...register("new_password")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {errors.new_password && (
              <p className="text-xs text-red-700">{errors.new_password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Updating…
              </div>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </div>

      {/* 2. Active Sessions */}
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Laptop className="h-5 w-5 text-teal-700" /> Active Sessions
            </h2>
            <p className="text-xs text-slate-600 mt-1">Devices currently logged into your account.</p>
          </div>

          <Button
            type="button"
            onClick={handleSignOutEverywhere}
            variant="outline"
            className="rounded-xl border-red-500/30 text-red-700 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Sign out everywhere
          </Button>
        </div>

        {loadingSessions ? (
          <div className="py-8 text-center text-slate-500">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-700" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 truncate max-w-xs">
                      {s.user_agent || "Unknown Browser / Device"}
                    </span>
                    {s.is_current && (
                      <span className="rounded-full bg-teal-500/10 text-teal-700 px-2 py-0.5 text-xs font-medium border border-teal-500/20">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    IP: {s.ip || "N/A"} • Last active: {new Date(s.last_used_at).toLocaleString()}
                  </p>
                </div>

                {!s.is_current && (
                  <Button
                    type="button"
                    onClick={() => handleRevokeSession(s.id)}
                    variant="ghost"
                    className="text-xs text-red-700 hover:bg-red-500/10 hover:text-red-700 rounded-xl"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Security Activity Audit Trail */}
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-emerald-700" /> Recent Security Activity
        </h2>

        {activities.length === 0 ? (
          <p className="text-sm text-slate-500">No activity logs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-semibold text-slate-800 uppercase">{act.event}</td>
                    <td className="py-3.5 px-4">{act.ip || "N/A"}</td>
                    <td className="py-3.5 px-4">{new Date(act.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
