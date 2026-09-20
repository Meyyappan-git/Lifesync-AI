"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { guestEmergencyProfile } from "@/lib/guest-sample";
import { ShieldCheck } from "lucide-react";

interface EmergencyProfile {
  blood_group: string | null;
  medical_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  trusted_contacts_json: Record<string, unknown> | null;
}

function EmergencyContent() {
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    blood_group: "",
    medical_conditions: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  useEffect(() => {
    if (guestMode) {
      setProfile(guestEmergencyProfile);
      setForm({
        blood_group: guestEmergencyProfile.blood_group || "",
        medical_conditions: guestEmergencyProfile.medical_conditions || "",
        emergency_contact_name: guestEmergencyProfile.emergency_contact_name || "",
        emergency_contact_phone: guestEmergencyProfile.emergency_contact_phone || "",
      });
      return;
    }

    apiClient.get<{ profile: EmergencyProfile | null }>('/api/v1/lifesync/emergency-profile').then((data) => {
      if (data.profile) {
        setProfile(data.profile);
        setForm({
          blood_group: data.profile.blood_group || "",
          medical_conditions: data.profile.medical_conditions || "",
          emergency_contact_name: data.profile.emergency_contact_name || "",
          emergency_contact_phone: data.profile.emergency_contact_phone || "",
        });
      }
    }).catch(() => setProfile(null));
  }, [guestMode]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiClient.put('/api/v1/lifesync/emergency-profile', form);
      setMessage('Emergency profile updated.');
    } catch {
      setMessage('Unable to save your emergency profile right now.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Emergency Vault</h1>
            <p className="text-sm text-zinc-400">Keep medical and contact details ready for the people who may need them.</p>
          </div>
        </div>
      </div>

      <form onSubmit={saveProfile} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <input value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} placeholder="Blood group" className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white" />
          <input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} placeholder="Emergency contact name" className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white" />
          <input value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} placeholder="Medical conditions" className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white" />
          <input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} placeholder="Emergency contact phone" className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white" />
        </div>
        <button type="submit" className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white">Save emergency profile</button>
        {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
      </form>

      {profile ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
          <p>Current profile is ready for quick access during emergencies.</p>
        </div>
      ) : null}
    </div>
  );
}

export default function EmergencyPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm p-4">Loading Emergency Vault...</div>}>
      <EmergencyContent />
    </Suspense>
  );
}
