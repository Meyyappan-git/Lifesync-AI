"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { guestEmergencyProfile } from "@/lib/guest-sample";

interface EmergencyProfileResponse {
  profile: {
    blood_group: string | null;
    medical_conditions: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    trusted_contacts_json: Record<string, unknown> | null;
  } | null;
}

function VaultContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  const [bloodGroup, setBloodGroup] = useState("");
  const [conditions, setConditions] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (guestMode) {
      setBloodGroup(guestEmergencyProfile.blood_group || "O+");
      setConditions(guestEmergencyProfile.medical_conditions || "Asthma (Mild), Penicillin Allergy");
      setContactName(guestEmergencyProfile.emergency_contact_name || "Sarah Jenkins");
      setContactPhone(guestEmergencyProfile.emergency_contact_phone || "+1 (555) 019-2834");
      return;
    }

    apiClient
      .get<EmergencyProfileResponse>("/api/v1/lifesync/emergency-profile")
      .then((res) => {
        if (res.profile) {
          setBloodGroup(res.profile.blood_group || "");
          setConditions(res.profile.medical_conditions || "");
          setContactName(res.profile.emergency_contact_name || "");
          setContactPhone(res.profile.emergency_contact_phone || "");
        }
      })
      .catch(() => setError("Unable to load profile details."));
  }, [guestMode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (guestMode) {
      setSaved(true);
      setLoading(false);
      setTimeout(() => setSaved(false), 3000);
      return;
    }

    try {
      await apiClient.put("/api/v1/lifesync/emergency-profile", {
        blood_group: bloodGroup,
        medical_conditions: conditions,
        emergency_contact_name: contactName,
        emergency_contact_phone: contactPhone,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save emergency profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-red-900/40 bg-gradient-to-r from-red-950/40 via-zinc-950 to-zinc-950 p-8 flex items-center gap-4 shadow-2xl">
        <div className="rounded-2xl bg-red-500/20 border border-red-500/30 p-4 text-red-400">
          <Lock className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Emergency Vault</h1>
          <p className="text-sm text-zinc-400 mt-1">Encrypted storage for emergency contacts, blood group, allergies, and trusted contacts.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 space-y-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">Blood Group</label>
            <input 
              value={bloodGroup} 
              onChange={e => setBloodGroup(e.target.value)} 
              placeholder="e.g. O+, A-, B+"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500" 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">Emergency Contact Name</label>
            <input 
              value={contactName} 
              onChange={e => setContactName(e.target.value)} 
              placeholder="e.g. Sarah Jenkins"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500" 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">Emergency Contact Phone</label>
            <input 
              value={contactPhone} 
              onChange={e => setContactPhone(e.target.value)} 
              placeholder="e.g. +1 (555) 019-2834"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500" 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">Medical Conditions & Allergies</label>
            <input 
              value={conditions} 
              onChange={e => setConditions(e.target.value)} 
              placeholder="e.g. Asthma (Mild), Penicillin Allergy"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500" 
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-6 py-3 font-bold flex items-center gap-2">
          <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Encrypted Vault Data"}
        </Button>

        {saved && <p className="text-xs font-bold text-emerald-400">Emergency Vault encrypted and updated successfully.</p>}
        {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
      </form>
    </div>
  );
}

export default function VaultPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm p-4">Loading Vault...</div>}>
      <VaultContent />
    </Suspense>
  );
}
