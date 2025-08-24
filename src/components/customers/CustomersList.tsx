"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Search, Filter, Trash2 } from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

// ---------------- Types ----------------
interface CustomerRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  accountNo?: string | null;
  createdAt?: string | null; // ISO
  tags?: string | null;

  // stats (server can compute; we fall back to 0)
  diariesTotal?: number | null;
  activeTotal?: number | null;
  overdueTotal?: number | null;
  lastActivityAt?: string | null; // ISO

  // ownership
  staff?: string | null; // createdByCode / owner
}

// API response type for customers
interface CustomerApiResponse {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  accountNo?: string | null;
  createdAt?: string | null;
  tags?: string | null;
  diariesTotal?: number | null;
  activeTotal?: number | null;
  overdueTotal?: number | null;
  lastActivityAt?: string | null;
  staff?: string | null;
  owner?: string | null;
  createdByCode?: string | null;
  _count?: {
    diaries?: number;
  };
}

// ---------------- Helpers ----------------
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const fade = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ---------------- Component ----------------
export default function CustomersList() {
  const [rows, setRows] = React.useState<CustomerRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // filters/search
  const [search, setSearch] = React.useState("");
  const [staff, setStaff] = React.useState<string>("all");
  const [fromDate, setFromDate] = React.useState<Date | undefined>();
  const [toDate, setToDate] = React.useState<Date | undefined>();
  const [tagQuery, setTagQuery] = React.useState("");
  const [onlyHasActive, setOnlyHasActive] = React.useState(false);
  const [onlyHasOverdue, setOnlyHasOverdue] = React.useState(false);

  // pagination
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const debouncedSearch = useDebounced(search, 250);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/customers")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data: CustomerApiResponse[]) => {
        if (cancelled) return;
        const mapped: CustomerRow[] = data.map((c: CustomerApiResponse) => ({
          id: c.id,
          name: c.name,
          email: c.email ?? null,
          phone: c.phone ?? null,
          accountNo: c.accountNo ?? null,
          createdAt: c.createdAt ?? null,
          tags: c.tags ?? null,
          diariesTotal: c.diariesTotal ?? 0,
          activeTotal: c.activeTotal ?? 0,
          overdueTotal: c.overdueTotal ?? 0,
          lastActivityAt: c.lastActivityAt ?? null,
          staff: c.staff ?? null,
        }));
        setRows(mapped);
        setError(null);
      })
      .catch((e) => {
        setError(typeof e === "string" ? e : e.message);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const staffOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows?.forEach((r) => r.staff && set.add(r.staff));
    return Array.from(set);
  }, [rows]);

  // derived filtering
  const filtered = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    const tagQ = tagQuery.toLowerCase().trim();

    let list = (rows ?? []).filter((r) => {
      // date range (created or last activity)
      const pivot = r.lastActivityAt || r.createdAt || undefined;
      if (
        fromDate &&
        pivot &&
        new Date(pivot) < new Date(format(fromDate, "yyyy-MM-dd"))
      )
        return false;
      if (toDate && pivot) {
        const to = new Date(format(toDate, "yyyy-MM-dd"));
        to.setHours(23, 59, 59, 999);
        if (new Date(pivot) > to) return false;
      }
      return true;
    });

    if (staff !== "all") list = list.filter((r) => r.staff === staff);
    if (onlyHasActive) list = list.filter((r) => (r.activeTotal ?? 0) > 0);
    if (onlyHasOverdue) list = list.filter((r) => (r.overdueTotal ?? 0) > 0);

    if (q) {
      list = list.filter((r) =>
        [r.name, r.email, r.phone, r.accountNo]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (tagQ)
      list = list.filter((r) => (r.tags || "").toLowerCase().includes(tagQ));

    // sort by last activity desc then created desc
    list.sort((a, b) => {
      const aPivot = new Date(a.lastActivityAt || a.createdAt || 0).getTime();
      const bPivot = new Date(b.lastActivityAt || b.createdAt || 0).getTime();
      return bPivot - aPivot;
    });

    return list;
  }, [
    rows,
    debouncedSearch,
    staff,
    fromDate,
    toDate,
    tagQuery,
    onlyHasActive,
    onlyHasOverdue,
  ]);

  // pagination slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  React.useEffect(() => {
    // reset to first page if filters change and page out of bounds
    setPage(1);
  }, [
    debouncedSearch,
    staff,
    fromDate,
    toDate,
    tagQuery,
    onlyHasActive,
    onlyHasOverdue,
  ]);

  async function deleteCustomer(id: string) {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });

      if (res.ok) {
        // Successfully deleted
        setRows((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
        setError(null); // Clear any previous errors
        toast({
          title: "Customer deleted",
          description: "Customer has been successfully removed.",
        });
      } else if (res.status === 409) {
        // Customer has active diaries
        const errorData = await res.json();
        const errorMessage =
          errorData.error ||
          "This customer has active diaries. Please close or cancel all diaries before deleting the customer.";
        setError(errorMessage);
        toast({
          title: "Cannot delete customer",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Other error
        const errorData = await res.json();
        const errorMessage =
          errorData.error || "Failed to delete customer. Please try again.";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      const errorMessage =
        "Network error. Please check your connection and try again.";
      setError(errorMessage);
      toast({
        title: "Network Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="w-full px-6 pb-12">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium mb-2">Cannot Delete Customer</div>
              <div className="text-sm">{error}</div>
              {error.includes("active diaries") && (
                <div className="mt-3 text-sm">
                  <div className="font-medium mb-1">To resolve this:</div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Go to the customers active diaries</li>
                    <li>Change their status to Collected or Cancelled</li>
                    <li>Or archive the diaries if you want to keep them</li>
                    <li>Then try deleting the customer again</li>
                  </ul>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Filter/search bar */}
      <div className="rounded-2xl border shadow-sm bg-white p-4 mb-5">
        {/* Row 1: search + quick filters to the right */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 w-full"
              placeholder="Search name / email / phone / account #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={staff} onValueChange={setStaff}>
            <SelectTrigger className="h-10 w-[160px]">
              <SelectValue placeholder="Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Staff: All</SelectItem>
              {staffOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: dates + tags + toggles */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start h-10 font-normal w-[160px]"
                >
                  {fromDate ? format(fromDate, "dd MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-2">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs">To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start h-10 font-normal w-[160px]"
                >
                  {toDate ? format(toDate, "dd MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-2">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Input
            className="w-[260px]"
            placeholder="Tags e.g. vip, warranty"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
          />

          <Button
            type="button"
            variant={onlyHasActive ? "default" : "outline"}
            className={cn(
              "h-10",
              onlyHasActive && "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => setOnlyHasActive((v) => !v)}
          >
            <Filter className="h-4 w-4 mr-2" />{" "}
            {onlyHasActive ? "Has active" : "Filter: active"}
          </Button>

          <Button
            type="button"
            variant={onlyHasOverdue ? "default" : "outline"}
            className={cn(
              "h-10",
              onlyHasOverdue && "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => setOnlyHasOverdue((v) => !v)}
          >
            <Filter className="h-4 w-4 mr-2" />{" "}
            {onlyHasOverdue ? "Has overdue" : "Filter: overdue"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border shadow-sm bg-white">
        <div className="grid grid-cols-12 px-4 py-3 text-xs font-medium text-muted-foreground">
          <div className="col-span-3">Customer</div>
          <div className="col-span-2">Email</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-1">Account #</div>
          <div className="col-span-1 text-center">Diaries</div>
          <div className="col-span-1 text-center">Active</div>
          <div className="col-span-1">Last activity</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="h-px bg-border" />

        {/* Rows */}
        <AnimatePresence>
          {loading && (
            <div className="p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse h-14 bg-muted/40 rounded-xl mb-2"
                />
              ))}
            </div>
          )}

          {!loading && pageItems.length === 0 && (
            <motion.div
              variants={fade}
              initial="hidden"
              animate="show"
              className="p-12 text-center text-muted-foreground"
            >
              No customers match your filters.{" "}
              <Button
                variant="link"
                onClick={() => {
                  setSearch("");
                  setStaff("all");
                  setFromDate(undefined);
                  setToDate(undefined);
                  setTagQuery("");
                  setOnlyHasActive(false);
                  setOnlyHasOverdue(false);
                }}
              >
                Clear filters
              </Button>
            </motion.div>
          )}

          {!loading &&
            pageItems.map((c) => (
              <motion.div
                key={c.id}
                variants={fade}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
                className="grid grid-cols-12 px-4 py-4 items-center hover:bg-muted/30"
              >
                <div className="col-span-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.createdAt
                      ? `Created ${new Date(c.createdAt).toLocaleDateString()}`
                      : null}
                  </div>
                </div>
                <div className="col-span-2 truncate">{c.email}</div>
                <div className="col-span-2 truncate">{c.phone}</div>
                <div className="col-span-1 truncate">{c.accountNo}</div>
                <div className="col-span-1 text-center">
                  {c.diariesTotal ?? 0}
                </div>
                <div className="col-span-1 text-center">
                  {c.activeTotal ?? 0}
                </div>
                <div className="col-span-1 truncate">
                  {c.lastActivityAt
                    ? format(new Date(c.lastActivityAt), "dd MMM yyyy")
                    : "—"}
                </div>
                <div className="col-span-1 flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="gap-1">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the customer and related
                          diaries. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => deleteCustomer(c.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Footer / pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <div className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium">{(page - 1) * pageSize + 1}</span>–
              <span className="font-medium">
                {Math.min(page * pageSize, filtered.length)}
              </span>{" "}
              of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <div className="text-xs">
                Page {page} / {totalPages}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
