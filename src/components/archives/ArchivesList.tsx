"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Search, Filter, RotateCcw, Trash2 } from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { toast } from "@/components/ui/use-toast";

// ---------------- Types ----------------
interface ArchivedDiaryRow {
  id: string;
  customerName?: string | null;
  customerPhone?: string | null;
  whatTheyWant: string;
  status: string;
  priority: string;
  isPaid: boolean;
  isOrdered: boolean;
  hasTextedCustomer: boolean;
  createdByCode?: string | null;
  createdAt?: string | null; // ISO
  archivedAt?: string | null; // ISO
  total?: string | null;
  paymentMethod?: string | null;
  amountPaid?: string | null;
  storeLocation?: string | null;
  tags?: string | null;
}

// API response type for archived diaries
interface ArchivedDiaryApiResponse {
  id: string;
  customer?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  whatTheyWant: string;
  status: string;
  priority: string;
  isPaid: boolean;
  isOrdered: boolean;
  hasTextedCustomer: boolean;
  createdByCode?: string | null;
  createdAt?: string | null;
  archivedAt?: string | null;
  total?: string | null;
  paymentMethod?: string | null;
  amountPaid?: string | null;
  storeLocation?: string | null;
  tags?: string | null;
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
export default function ArchivesList() {
  const [rows, setRows] = React.useState<ArchivedDiaryRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // filters/search
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [staff, setStaff] = React.useState<string>("all");
  const [fromDate, setFromDate] = React.useState<Date | undefined>();
  const [toDate, setToDate] = React.useState<Date | undefined>();
  const [tagQuery, setTagQuery] = React.useState("");
  const [onlyPaid, setOnlyPaid] = React.useState(false);
  const [onlyOrdered, setOnlyOrdered] = React.useState(false);

  // pagination
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const debouncedSearch = useDebounced(search, 250);

  const fetchArchivedDiaries = React.useCallback(async () => {
    setLoading(true);
    try {
      console.log("Fetching archived diaries...");
      const res = await fetch("/api/diaries?archived=1");
      console.log("Archives API response status:", res.status);

      if (!res.ok) throw new Error(await res.text());
      const data: ArchivedDiaryApiResponse[] = await res.json();
      console.log("Archives API returned diaries:", data.length);
      console.log("First few diaries:", data.slice(0, 3));

      const mapped: ArchivedDiaryRow[] = data.map(
        (d: ArchivedDiaryApiResponse) => ({
          id: d.id,
          customerName: d.customer?.name ?? null,
          customerPhone: d.customer?.phone ?? null,
          whatTheyWant: d.whatTheyWant,
          status: d.status,
          priority: d.priority,
          isPaid: d.isPaid,
          isOrdered: d.isOrdered,
          hasTextedCustomer: d.hasTextedCustomer,
          createdByCode: d.createdByCode ?? null,
          createdAt: d.createdAt ?? null,
          archivedAt: d.archivedAt ?? null,
          total: d.total ?? null,
          paymentMethod: d.paymentMethod ?? null,
          amountPaid: d.amountPaid ?? null,
          storeLocation: d.storeLocation ?? null,
          tags: d.tags ?? null,
        })
      );
      console.log("Mapped archived diaries:", mapped.length);
      setRows(mapped);
      setError(null);
    } catch (e) {
      console.error("Failed to fetch archived diaries:", e);
      setError(typeof e === "string" ? e : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchArchivedDiaries();
  }, [fetchArchivedDiaries]);

  const staffOptions = React.useMemo(() => {
    const set = new Set<string>();
    rows?.forEach((r) => r.createdByCode && set.add(r.createdByCode));
    return Array.from(set);
  }, [rows]);

  // derived filtering
  const filtered = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    const tagQ = tagQuery.toLowerCase().trim();

    let list = (rows ?? []).filter((r) => {
      // date range (archived date)
      const pivot = r.archivedAt || r.createdAt || undefined;
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

    if (status !== "all") list = list.filter((r) => r.status === status);
    if (priority !== "all") list = list.filter((r) => r.priority === priority);
    if (staff !== "all") list = list.filter((r) => r.createdByCode === staff);
    if (onlyPaid) list = list.filter((r) => r.isPaid);
    if (onlyOrdered) list = list.filter((r) => r.isOrdered);

    if (q) {
      list = list.filter((r) =>
        [r.customerName, r.customerPhone, r.whatTheyWant, r.storeLocation]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (tagQ)
      list = list.filter((r) => (r.tags || "").toLowerCase().includes(tagQ));

    // sort by archived date desc then created desc
    list.sort((a, b) => {
      const aPivot = new Date(a.archivedAt || a.createdAt || 0).getTime();
      const bPivot = new Date(b.archivedAt || b.createdAt || 0).getTime();
      return bPivot - aPivot;
    });

    return list;
  }, [
    rows,
    debouncedSearch,
    status,
    priority,
    staff,
    fromDate,
    toDate,
    tagQuery,
    onlyPaid,
    onlyOrdered,
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
    status,
    priority,
    staff,
    fromDate,
    toDate,
    tagQuery,
    onlyPaid,
    onlyOrdered,
  ]);

  async function restoreDiary(id: string) {
    try {
      console.log("Restoring diary:", id);
      const res = await fetch(`/api/diaries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedAt: null }),
      });

      console.log("Restore response status:", res.status);
      console.log("Restore response ok:", res.ok);

      if (res.ok) {
        const restoredDiary = await res.json();
        console.log("Restored diary data:", restoredDiary);

        // Successfully restored - remove from local state immediately
        setRows((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));

        toast({
          title: "Diary restored",
          description: "The diary has been restored to the main dashboard.",
        });
      } else {
        // Error occurred
        const errorText = await res.text();
        console.error("Restore error:", errorText);
        toast({
          title: "Error restoring diary",
          description:
            errorText || "Failed to restore diary. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Restore network error:", err);
      toast({
        title: "Network Error",
        description:
          "Failed to restore diary. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  }

  async function deleteDiary(id: string) {
    try {
      const res = await fetch(`/api/diaries/${id}`, { method: "DELETE" });

      if (res.ok) {
        // Successfully deleted - remove from local state immediately
        setRows((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));

        toast({
          title: "Diary deleted",
          description: "The diary has been permanently deleted.",
        });
      } else {
        // Error occurred
        const errorText = await res.text();
        toast({
          title: "Error deleting diary",
          description: errorText || "Failed to delete diary. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Network Error",
        description:
          "Failed to delete diary. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 max-w-[1400px] mx-auto">
      {/* Header with better spacing for wide screens */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Archives
          </h1>
          <p className="text-gray-600 mt-1">
            View and manage archived diaries. Restore them to the main dashboard
            or permanently delete them.
          </p>
        </div>
        <Button
          onClick={fetchArchivedDiaries}
          variant="outline"
          size="lg"
          className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 hover:scale-105 transition-all duration-300 shadow-sm"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      )}

      {/* Enhanced Filter/Search Section - optimized for smaller screens */}
      <Card className="rounded-2xl border-rounded shadow-lg mb-6 sm:mb-8 bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-4 sm:p-6">
          {/* Row 1: search + quick filters to the right */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 w-full"
                placeholder="Search customer / phone / request / location"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Ordered">Ordered</SelectItem>
                <SelectItem value="ReadyForPickup">Ready for Pickup</SelectItem>
                <SelectItem value="Collected">Collected</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-10 w-[160px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Priority: All</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

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
              variant={onlyPaid ? "default" : "outline"}
              className={cn(
                "h-10",
                onlyPaid && "bg-green-600 hover:bg-green-700"
              )}
              onClick={() => setOnlyPaid((v) => !v)}
            >
              <Filter className="h-4 w-4 mr-2" />{" "}
              {onlyPaid ? "Paid only" : "Filter: paid"}
            </Button>

            <Button
              type="button"
              variant={onlyOrdered ? "default" : "outline"}
              className={cn(
                "h-10",
                onlyOrdered && "bg-green-600 hover:bg-green-700"
              )}
              onClick={() => setOnlyOrdered((v) => !v)}
            >
              <Filter className="h-4 w-4 mr-2" />{" "}
              {onlyOrdered ? "Ordered only" : "Filter: ordered"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Table - matching dashboard styling */}
      <Card className="rounded-2xl border-rounded shadow-lg bg-white">
        <CardContent className="p-0">
          <div className="grid grid-cols-12 px-4 py-3 text-xs font-medium text-muted-foreground">
            <div className="col-span-3">Customer & Request</div>
            <div className="col-span-2">Status & Priority</div>
            <div className="col-span-2">Payment & Order</div>
            <div className="col-span-2">Staff & Dates</div>
            <div className="col-span-2">Location & Tags</div>
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
                No archived diaries match your filters.{" "}
                <Button
                  variant="link"
                  onClick={() => {
                    setSearch("");
                    setStatus("all");
                    setPriority("all");
                    setStaff("all");
                    setFromDate(undefined);
                    setToDate(undefined);
                    setTagQuery("");
                    setOnlyPaid(false);
                    setOnlyOrdered(false);
                  }}
                >
                  Clear filters
                </Button>
              </motion.div>
            )}

            {!loading &&
              pageItems.map((d) => (
                <motion.div
                  key={d.id}
                  variants={fade}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-12 px-4 py-4 items-center hover:bg-muted/30"
                >
                  <div className="col-span-3">
                    <div className="font-medium">
                      {d.customerName || "No customer"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.whatTheyWant}
                    </div>
                    {d.customerPhone && (
                      <div className="text-xs text-muted-foreground">
                        {d.customerPhone}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <div className="flex flex-col gap-1">
                      <StatusBadge
                        status={
                          d.status as
                            | "Pending"
                            | "Ordered"
                            | "ReadyForPickup"
                            | "Collected"
                            | "Cancelled"
                        }
                      />
                      <PriorityBadge
                        priority={
                          d.priority as "Low" | "Normal" | "High" | "Urgent"
                        }
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-xs space-y-1">
                      <div
                        className={cn(
                          d.isPaid ? "text-green-600" : "text-muted-foreground"
                        )}
                      >
                        {d.isPaid ? "✓ Paid" : "✗ Unpaid"}
                      </div>
                      <div
                        className={cn(
                          d.isOrdered
                            ? "text-blue-600"
                            : "text-muted-foreground"
                        )}
                      >
                        {d.isOrdered ? "✓ Ordered" : "✗ Not ordered"}
                      </div>
                      {d.total && <div className="font-medium">${d.total}</div>}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-xs space-y-1">
                      <div>By: {d.createdByCode || "—"}</div>
                      <div className="text-muted-foreground">
                        {d.createdAt
                          ? `Created ${format(
                              new Date(d.createdAt),
                              "dd MMM yyyy"
                            )}`
                          : null}
                      </div>
                      <div className="text-muted-foreground">
                        {d.archivedAt
                          ? `Archived ${format(
                              new Date(d.archivedAt),
                              "dd MMM yyyy"
                            )}`
                          : null}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-xs space-y-1">
                      {d.storeLocation && (
                        <div className="truncate">{d.storeLocation}</div>
                      )}
                      {d.tags && (
                        <div className="text-muted-foreground truncate">
                          Tags: {d.tags}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end gap-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:scale-105 transition-all duration-300 rounded-xl"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Restore diary?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will move the diary back to the main dashboard
                            and make it active again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => restoreDiary(d.id)}
                          >
                            Restore
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 hover:scale-105 transition-all duration-300 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Permanently delete diary?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the diary and all
                            related data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteDiary(d.id)}
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
                <span className="font-medium">{(page - 1) * pageSize + 1}</span>
                –
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
        </CardContent>
      </Card>
    </div>
  );
}
