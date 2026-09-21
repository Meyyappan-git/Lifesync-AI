"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { changePasswordApi, updateMeApi } from "@/lib/api/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, ChangePasswordInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { 
  UserCircle, 
  Lock, 
  Mail, 
  ShieldCheck, 
  Activity, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";

export default function SettingsPage() {
  const { user, refetchUser } = useAuth();
  
  // Profile Update States
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Password Update States
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

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
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message || "Failed to change password." });
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
    <div className="space-y-8 font-sans max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Account Settings</h1>
        <p className="mt-2 text-sm text-zinc-400">Manage your profile details and security credentials.</p>
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
                {profileMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
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

      </div>
    </div>
  );
}
