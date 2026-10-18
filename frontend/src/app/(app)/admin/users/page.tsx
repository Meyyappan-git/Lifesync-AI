"use client";

import React, { useEffect, useState } from "react";
import { RequireRole } from "@/lib/auth/guards";
import { getAdminUsersApi } from "@/lib/api/auth";
import { User } from "@/types/auth";
import { Users, Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (p: number) => {
    setLoading(true);
    try {
      const data = await getAdminUsersApi(p, 10);
      setUsers(data.items);
      setTotalPages(data.pages);
      setPage(data.page);
    } catch {
      // Handled by 403 guard if unauthorized
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  return (
    <RequireRole roles={["admin"]}>
      <div className="max-w-6xl space-y-8 font-sans">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-teal-700" /> User Directory
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage registered users, roles, and account verification statuses.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-700" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Email Verified</th>
                      <th className="py-3 px-4">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900">{u.full_name}</div>
                          <div className="text-xs font-mono text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                              u.role === "admin"
                                ? "bg-cyan-500/10 text-cyan-700 border-cyan-500/20"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            <Shield className="h-3 w-3" /> {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-medium text-emerald-700">Active</span>
                        </td>
                        <td className="py-4 px-4">
                          {u.email_verified ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                              <CheckCircle className="h-4 w-4" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                              <XCircle className="h-4 w-4" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs font-mono">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    variant="outline"
                    className="rounded-xl border-slate-200 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    variant="outline"
                    className="rounded-xl border-slate-200 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
