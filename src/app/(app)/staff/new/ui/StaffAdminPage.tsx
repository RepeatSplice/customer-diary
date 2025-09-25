// src/app/(app)/staff/new/ui/StaffAdminPage.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Eye,
  EyeOff,
  ShieldPlus,
  UserPlus,
  Trash2,
  Loader2,
  Search,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import RefreshButton from "@/components/RefreshButton";

type StaffRow = {
  id: string;
  fullName: string;
  staffCode: string;
  role: "staff" | "manager";
  createdAt: string;
};

function genPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function useDebounced<T>(value: T, delay = 300) {
  const [val, setVal] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setVal(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return val;
}

export default function StaffAdminPage() {
  // ---------- Create form ----------
  const [fullName, setFullName] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [role, setRole] = useState<"staff" | "manager">("staff");
  const [pin, setPin] = useState(genPin());
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/staff-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, staffCode, role, pin }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create user");
      }
      toast({ title: "User created", duration: 15000 });
      // reset form
      setFullName("");
      setStaffCode("");
      setRole("staff");
      setPin(genPin());
      // refresh list
      await load();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({
        title: "Create failed",
        description: errorMessage,
        variant: "destructive",
        duration: 15000,
      });
    } finally {
      setSaving(false);
    }
  }

  // ---------- List state ----------
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // header bar controls
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "staff" | "manager">(
    "all"
  );
  const debouncedQuery = useDebounced(query, 350);

  // pagination
  const pageSize = 25;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
      if (debouncedQuery) params.set("query", debouncedQuery);
      if (roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/staff-users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load staff");
      const data = await res.json();
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({
        title: "Load failed",
        description: errorMessage,
        variant: "destructive",
        duration: 15000,
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQuery, roleFilter]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, roleFilter]);
  useEffect(() => {
    load();
  }, [load]);

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function onDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/staff-users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "User deleted", duration: 15000 });
      // If we removed the last item on the page, refresh to show previous page
      if (rows.length === 1 && page > 0) setPage((p) => p - 1);
      else await load();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setRows(prev); // revert
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
        duration: 15000,
      });
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 max-w-[1400px] mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Staff Users
          </h1>
          <p className="text-gray-600 mt-1">
            Manage staff accounts and permissions
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Create form */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader>
            <CardTitle className="text-base">Staff details</CardTitle>
            <CardDescription>
              Create a new staff or manager account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold pb-2">
                    Full name
                  </Label>
                  <Input
                    value={fullName}
                    placeholder="John Doe"
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold pb-2">Staff #</Label>
                  <Input
                    value={staffCode}
                    placeholder="920"
                    onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold pb-2">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v: "staff" | "manager") => setRole(v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" /> Staff
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <ShieldPlus className="h-4 w-4" /> Manager
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold pb-2">PIN</Label>
                  <div className="flex gap-2">
                    <Input
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      type={showPin ? "text" : "password"}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPin((s) => !s)}
                    >
                      {showPin ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPin(genPin())}
                    >
                      Generate
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    6-digit numeric PIN.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    "h-9 px-3 rounded-full border transition-colors",
                    saving
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400"
                  )}
                >
                  {saving ? "Saving…" : "Create user"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Staff list header bar */}
      <div className="mt-8 mb-2 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-11 rounded-xl"
            placeholder="Search staff by name or code…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 md:justify-end">
          <Select
            value={roleFilter}
            onValueChange={(v: "all" | "staff" | "manager") => setRoleFilter(v)}
          >
            <SelectTrigger className="h-11 w-[160px] rounded-xl">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Staff table */}
      <Card className="rounded-2xl shadow-sm border">
        <CardHeader>
          <CardTitle className="text-base">Staff List</CardTitle>
          <CardDescription>
            Manage your team of {total} staff members.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="[&>th]:py-3 [&>th]:px-4">
                  <th>Name</th>
                  <th>Staff code</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th className="w-1 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`sk-${i}`} className="[&>td]:py-3 [&>td]:px-4">
                        <td colSpan={5}>
                          <div className="h-5 w-full rounded bg-muted/50 animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 px-4 text-center text-sm text-muted-foreground"
                      >
                        No staff match your filters. Try changing the search or
                        role.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="hover:bg-muted/40"
                      >
                        <td className="py-3 px-4 font-medium">{r.fullName}</td>
                        <td className="py-3 px-4">{r.staffCode}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              r.role === "manager"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {r.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-red-600 "
                              onClick={() => setDeleteId(r.id)}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 bg-white">
            <div className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove their access. You can’t undo this
              action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={onDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
