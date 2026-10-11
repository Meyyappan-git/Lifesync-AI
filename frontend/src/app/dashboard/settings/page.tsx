"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { 
  changePasswordApi, 
  updateMeApi, 
  getMySessionsApi, 
  revokeMySessionApi, 
  getMyActivityApi 
} from "@/lib/api/auth";
import { AuthSession, ActivityLog } from "@/types/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, ChangePasswordInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { 
  UserCircle, 
  Lock, 
  Mail, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Laptop,
  LogOut,
  Clock,
  Key
} from "lucide-react";

export default function SettingsPage() {
  const { user, refetchUser, logoutAll } = useAuth();
  
  // Profile Update States
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Password Update States
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Sessions and Security Activity States
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isUpdatingPassword },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
    },
  });

  const fetchSecurityData = async () => {
    try {
      const [sessData, actData] = await Promise.all([
        getMySessionsApi(), 
        getMyActivityApi(1, 10)
      ]);
      setSessions(sessData);
      setActivities(actData.items);
    } catch {
      // Ignored if unauthenticated or error
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      fetchSecurityData();
    }
  }, [user]);

  const onUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!fullName.trim() || fullName === user?.full_name) return;
    
    setUpdatingProfile(true);
    try {
      await updateMeApi(fullName.trim());
      await refetchUser();
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const onUpdatePassword = async (data: ChangePasswordInput) => {
    setPasswordMsg(null);
    try {
      const res = await changePasswordApi(data);
      setPasswordMsg({ type: "success", text: res.message || "Password changed successfully." });
      resetPasswordForm();
      fetchSecurityData();
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message || "Failed to change password." });
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

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-400">
        You must be signed in to view settings.
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Account & Security Hub</h1>
        <p className="mt-2 text-sm text-zinc-400">Manage your profile, credentials, active device sessions, and audit trail.</p>
      </div>

      <div className="grid gap-8">
        
        {/* Profile Details Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <UserCircle className="h-6 w-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Personal Information</h2>
          </div>

          <form onSubmit={onUpdateProfile} className="space-y-5">
            {profileMsg && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${profileMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                {profileMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" /> Account Role
                </label>
                <input
                  type="text"
                  disabled
                  value={user.role || "User"}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-500 cursor-not-allowed capitalize"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={updatingProfile || fullName === user.full_name} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-2.5 font-medium shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                {updatingProfile ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Updating...</span> : "Save Profile"}
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <Lock className="h-6 w-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordSubmit(onUpdatePassword)} className="space-y-5 max-w-md">
            {passwordMsg && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${passwordMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                {passwordMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Current Password</label>
              <input
                type="password"
                {...registerPassword("current_password")}
                placeholder="Enter current password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              {passwordErrors.current_password && <p className="text-xs text-rose-400">{passwordErrors.current_password.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">New Password</label>
              <input
                type="password"
                {...registerPassword("new_password")}
                placeholder="Enter new password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              {passwordErrors.new_password && <p className="text-xs text-rose-400">{passwordErrors.new_password.message}</p>}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={isUpdatingPassword} className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl px-6 py-2.5 font-medium shadow-lg shadow-amber-600/20 disabled:opacity-50">
                {isUpdatingPassword ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Changing...</span> : "Update Password"}
              </Button>
            </div>
          </form>
          
          <div className="mt-4 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-500">
            Note: Changing your password will automatically sign out all your other active sessions across devices.
          </div>
        </div>

        {/* Active Sessions Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Laptop className="h-5 w-5 text-indigo-400" /> Active Login Sessions
              </h2>
              <p className="text-xs text-zinc-400 mt-1">Devices currently authenticated to your account.</p>
            </div>

            <Button
              type="button"
              onClick={handleSignOutEverywhere}
              variant="outline"
              className="rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Sign out all other devices
            </Button>
          </div>

          {loadingSessions ? (
            <div className="py-8 text-center text-zinc-500">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-zinc-500">No other active sessions detected.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate max-w-xs">
                        {s.user_agent || "Web Browser Session"}
                      </span>
                      {s.is_current && (
                        <span className="rounded-full bg-indigo-500/10 text-indigo-400 px-2 py-0.5 text-xs font-medium border border-indigo-500/20">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      IP: {s.ip || "Localhost / Protected"} • Last active: {new Date(s.last_used_at).toLocaleString()}
                    </p>
                  </div>

                  {!s.is_current && (
                    <Button
                      type="button"
                      onClick={() => handleRevokeSession(s.id)}
                      variant="ghost"
                      className="text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & Audit Activity Trail Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <Clock className="h-6 w-6 text-emerald-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Security & Audit Activity Trail</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Chronological record of recent logins, document uploads, and security events.</p>
            </div>
          </div>

          {activities.length === 0 ? (
            <p className="text-sm text-zinc-500">No security events logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-zinc-950/50">
                      <td className="py-3.5 px-4 font-semibold text-zinc-200 uppercase">{act.event}</td>
                      <td className="py-3.5 px-4">{act.ip || "Internal"}</td>
                      <td className="py-3.5 px-4">{new Date(act.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
