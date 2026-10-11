"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Lock, Save, Plus, Trash2, Printer, Shield, 
  Phone, Heart, User, CheckCircle2, AlertTriangle, ShieldCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { guestEmergencyProfile } from "@/lib/guest-sample";

interface TrustedContact {
  name: string;
  relation: string;
  phone: string;
  email?: string;
}

interface EmergencyProfileResponse {
  profile: {
    blood_group: string | null;
    medical_conditions: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    trusted_contacts_json: { contacts?: TrustedContact[] } | null;
  } | null;
}

function VaultContent() {
  const searchParams = useSearchParams();
  const guestMode = searchParams.get("guest") === "1";

  const [bloodGroup, setBloodGroup] = useState("");
  const [conditions, setConditions] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (guestMode) {
      setBloodGroup(guestEmergencyProfile.blood_group || "O+");
      setConditions(guestEmergencyProfile.medical_conditions || "Asthma (Mild), Penicillin Allergy");
      setContactName(guestEmergencyProfile.emergency_contact_name || "Sarah Jenkins");
      setContactPhone(guestEmergencyProfile.emergency_contact_phone || "+1 (555) 019-2834");
      setTrustedContacts([
        { name: "Dr. Robert Vance", relation: "Primary Physician", phone: "+1 (555) 012-4491" },
        { name: "David Jenkins", relation: "Brother", phone: "+1 (555) 018-9932" }
      ]);
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
          if (res.profile.trusted_contacts_json?.contacts) {
            setTrustedContacts(res.profile.trusted_contacts_json.contacts);
          }
        }
      })
      .catch(() => setError("Unable to load profile details."));
  }, [guestMode]);

  const addContact = () => {
    setTrustedContacts([...trustedContacts, { name: "", relation: "", phone: "" }]);
  };

  const removeContact = (idx: number) => {
    setTrustedContacts(trustedContacts.filter((_, i) => i !== idx));
  };

  const updateContact = (idx: number, field: keyof TrustedContact, value: string) => {
    const copy = [...trustedContacts];
    copy[idx] = { ...copy[idx], [field]: value };
    setTrustedContacts(copy);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validContacts = trustedContacts.filter(c => c.name.trim() && c.phone.trim());

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
        trusted_contacts_json: { contacts: validContacts }
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save emergency profile.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-red-900/40 bg-gradient-to-r from-red-950/40 via-zinc-950 to-zinc-950 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-red-500/20 border border-red-500/30 p-4 text-red-400">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Emergency Vault &amp; ICE Profile</h1>
            <p className="text-sm text-zinc-400 mt-1">Encrypted critical health information, allergies, and contacts for first responders.</p>
          </div>
        </div>

        <Button
          onClick={handlePrint}
          variant="outline"
          className="border-red-500/30 bg-red-950/30 hover:bg-red-900/40 text-red-300 rounded-2xl px-4 py-2.5 text-xs font-bold flex items-center gap-2 self-start md:self-auto"
        >
          <Printer className="h-4 w-4" /> Print ICE Emergency Card
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8 space-y-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Shield className="h-5 w-5 text-red-400" /> Primary Medical Data
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">Blood Group</label>
                <input 
                  value={bloodGroup} 
                  onChange={e => setBloodGroup(e.target.value)} 
                  placeholder="e.g. O+, A-, B+"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">Medical Conditions &amp; Allergies</label>
                <input 
                  value={conditions} 
                  onChange={e => setConditions(e.target.value)} 
                  placeholder="e.g. Asthma, Penicillin Allergy"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">Primary Emergency Contact</label>
                <input 
                  value={contactName} 
                  onChange={e => setContactName(e.target.value)} 
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">Primary Contact Phone</label>
                <input 
                  value={contactPhone} 
                  onChange={e => setContactPhone(e.target.value)} 
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500" 
                />
              </div>
            </div>

            {/* Additional Trusted Contacts */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Secondary Trusted Contacts</h3>
                  <p className="text-xs text-zinc-400">Additional family members, physicians, or trusted ICE persons</p>
                </div>
                <Button
                  type="button"
                  onClick={addContact}
                  variant="outline"
                  className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold px-3 py-1.5 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5 text-red-400" /> Add Contact
                </Button>
              </div>

              {trustedContacts.map((c, i) => (
                <div key={i} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/90 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <input
                    placeholder="Name"
                    value={c.name}
                    onChange={e => updateContact(i, "name", e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                  <input
                    placeholder="Relation (e.g. Doctor, Spouse)"
                    value={c.relation}
                    onChange={e => updateContact(i, "relation", e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      placeholder="Phone number"
                      value={c.phone}
                      onChange={e => updateContact(i, "phone", e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="text-zinc-500 hover:text-rose-400 p-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-6 py-2.5 font-bold flex items-center gap-2 shadow-lg shadow-red-600/20">
                <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Encrypted Profile"}
              </Button>
              {saved && <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Profile Updated</span>}
              {error && <span className="text-xs font-bold text-rose-400">{error}</span>}
            </div>
          </form>
        </div>

        {/* Live ICE Card Preview Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-3xl border-2 border-red-500/40 bg-zinc-950 p-6 space-y-5 shadow-2xl relative overflow-hidden" id="ice-card-preview">
            <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl tracking-wider uppercase">
              ICE Emergency Card
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest block">First Responder Medical Tag</span>
              <h3 className="text-xl font-extrabold text-white">Emergency Medical Tag</h3>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Blood Group:</span>
                <span className="text-lg font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg">
                  {bloodGroup || "Not Set"}
                </span>
              </div>

              <div className="space-y-1 pt-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-400 block">Allergies &amp; Vitals:</span>
                <span className="text-xs font-semibold text-zinc-200 block">
                  {conditions || "None listed"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">Primary ICE Contact</span>
              <div className="text-sm font-bold text-white">{contactName || "No contact named"}</div>
              <div className="text-xs font-mono text-red-400 flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {contactPhone || "No phone listed"}
              </div>
            </div>

            {trustedContacts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Additional ICE Contacts</span>
                <div className="space-y-1.5">
                  {trustedContacts.map((c, i) => (
                    <div key={i} className="text-xs text-zinc-300 flex items-center justify-between bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800/80">
                      <span><strong>{c.name}</strong> ({c.relation || "Contact"})</span>
                      <span className="font-mono text-zinc-400 text-[11px]">{c.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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
