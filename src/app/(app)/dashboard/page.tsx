// src/app/(app)/dashboard/page.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { Search, Filter, Archive, RefreshCw } from "lucide-react";

// shadcn/ui
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";

// ---------- Types ----------
export type Status =
  | "Pending"
  | "Ordered"
  | "ReadyForPickup"
  | "Collected"
  | "Cancelled";
export type Priority = "Low" | "Normal" | "High" | "Urgent";

interface DiaryRow {
  id: string;
  whatTheyWant: string | null;
  status: Status;
  priority: Priority;
  total: number | string | null;
  createdAt: string; // ISO
  dueDate?: string | null;
  isPaid?: boolean | null;
  staff?: string | null; // createdByCode or display name
  customer?: {
    id: string;
    name: string | null;
    email?: string | null;
    phone?: string | null;
    accountNo?: string | null;
  } | null;
  tags?: string | null; // comma-separated if you store it
}

// API response type for diaries
interface DiaryApiResponse {
  id: string;
  whatTheyWant?: string | null;
  status?: string | null;
  priority?: string | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  createdAt: string;
  dueDate?: string | null;
  isPaid?: boolean | null;
  createdByCode?: string | null;
  createdBy?: string | null;
  customer?: {
    id: string;
    name: string | null;
    email?: string | null;
    phone?: string | null;
    accountNo?: string | null;
  } | null;
  tags?: string | null;
}

// ---------- Helpers ----------
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

const STATUS_OPTIONS: Status[] = [
  "Pending",
  "Ordered",
  "ReadyForPickup",
  "Collected",
  "Cancelled",
];
const PRIORITY_OPTIONS: Priority[] = ["Low", "Normal", "High", "Urgent"];

// ---------- Page ----------
export default function DashboardPage() {
  const [rows, setRows] = React.useState<DiaryRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  // filters
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [paid, setPaid] = React.useState<string>("all");
  const [staff, setStaff] = React.useState<string>("all");
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [fromDate, setFromDate] = React.useState<Date | undefined>(undefined);
  const [toDate, setToDate] = React.useState<Date | undefined>(undefined);
  const [tagQuery, setTagQuery] = React.useState("");

  const debouncedSearch = useDebounced(search, 250);

  const fetchDiaries = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diaries?archived=0&limit=200");
      if (!res.ok) throw new Error(await res.text());
      const data: DiaryApiResponse[] = await res.json();
      const mapped: DiaryRow[] = data.map((d: DiaryApiResponse) => ({
        id: d.id,
        whatTheyWant: d.whatTheyWant ?? null,
        status: (d.status ?? "Pending") as Status,
        priority: (d.priority ?? "Normal") as Priority,
        total: d.total ?? d.subtotal ?? 0,
        createdAt: d.createdAt,
        dueDate: d.dueDate ?? null,
        isPaid: d.isPaid ?? null,
        staff: d.createdByCode ?? d.createdBy ?? null,
        customer: d.customer ?? null,
        tags: d.tags ?? null,
      }));
      setRows(mapped);
    } catch (e) {
      console.error("Failed to fetch diaries:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  // Refresh when page becomes visible (e.g., user returns from archives)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDiaries();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchDiaries]);

  const staffOptions = React.useMemo(() => {
    const s = new Set<string>();
    rows?.forEach((r) => r.staff && s.add(r.staff));
    return Array.from(s);
  }, [rows]);

  const stats = React.useMemo(() => {
    const all = rows ?? [];
    const now = new Date();
    const active = all.filter(
      (r) => !["Collected", "Cancelled"].includes(r.status)
    ).length;
    const overdue = all.filter((r) => {
      if (!r.dueDate) return false;
      return (
        new Date(r.dueDate) < now &&
        !["Collected", "Cancelled"].includes(r.status)
      );
    }).length;
    const last30 = all.filter((r) => {
      if (r.status !== "Collected") return false;
      const created = new Date(r.createdAt);
      const days = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;
    return { active, overdue, last30 };
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    const tagQ = tagQuery.toLowerCase().trim();

    return (rows ?? [])
      .filter((r) => (status === "all" ? true : r.status === status))
      .filter((r) => (priority === "all" ? true : r.priority === priority))
      .filter((r) =>
        paid === "all" ? true : paid === "paid" ? !!r.isPaid : !r.isPaid
      )
      .filter((r) => (staff === "all" ? true : r.staff === staff))
      .filter((r) => {
        if (!fromDate && !toDate) return true;
        const created = new Date(r.createdAt);
        if (fromDate && created < new Date(format(fromDate, "yyyy-MM-dd")))
          return false;
        if (toDate) {
          const to = new Date(format(toDate, "yyyy-MM-dd"));
          to.setHours(23, 59, 59, 999);
          if (created > to) return false;
        }
        return true;
      })
      .filter((r) =>
        overdueOnly
          ? r.dueDate
            ? new Date(r.dueDate) < new Date() &&
              !["Collected", "Cancelled"].includes(r.status)
            : false
          : true
      )
      .filter((r) => {
        if (!q) return true;
        const hay = [
          r.customer?.name,
          r.customer?.email,
          r.customer?.phone,
          r.customer?.accountNo,
          r.whatTheyWant,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .filter((r) =>
        tagQ ? (r.tags || "").toLowerCase().includes(tagQ) : true
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [
    rows,
    status,
    priority,
    paid,
    staff,
    fromDate,
    toDate,
    overdueOnly,
    debouncedSearch,
    tagQuery,
  ]);

  const applyStatFilter = (key: "active" | "overdue" | "completed30") => {
    if (key === "active") {
      setStatus("all");
      setOverdueOnly(false);
      setPriority("all");
      setPaid("all");
    } else if (key === "overdue") {
      setOverdueOnly(true);
      setStatus("all");
    } else if (key === "completed30") {
      setStatus("Collected");
      setOverdueOnly(false);
    }
  };

  return (
    <div className="w-full px-8 pb-12 max-w-[1920px] mx-auto">
      {/* Header with better spacing for wide screens */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Manage customer diaries and track progress
          </p>
        </div>
        <Button
          onClick={fetchDiaries}
          variant="outline"
          size="lg"
          className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 hover:scale-105 transition-all duration-300 shadow-sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Enhanced Stat cards - optimized for 1920px width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 overflow-hidden group">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div className="z-10 relative">
                  <div className="text-emerald-700 font-medium text-sm uppercase tracking-wide">
                    Active Diaries
                  </div>
                  <div className="mt-2">
                    <div className="text-4xl font-bold text-emerald-800">
                      {stats.active}
                    </div>
                    <div className="text-emerald-600 text-sm mt-1">
                      Currently in progress
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 bg-emerald-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-emerald-800 font-bold text-2xl">
                    {stats.active}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="h-auto p-0 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-200/50 mt-4 rounded-xl"
                onClick={() => applyStatFilter("active")}
              >
                View all active →
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 overflow-hidden group">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div className="z-10 relative">
                  <div className="text-red-700 font-medium text-sm uppercase tracking-wide">
                    Overdue
                  </div>
                  <div className="mt-2">
                    <div className="text-4xl font-bold text-red-800">
                      {stats.overdue}
                    </div>
                    <div className="text-red-600 text-sm mt-1">
                      Requires attention
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 bg-red-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-red-800 font-bold text-2xl">
                    {stats.overdue}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="h-auto p-0 text-red-700 hover:text-red-800 hover:bg-red-200/50 mt-4 rounded-xl"
                onClick={() => applyStatFilter("overdue")}
              >
                View overdue →
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 overflow-hidden group">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div className="z-10 relative">
                  <div className="text-blue-700 font-medium text-sm uppercase tracking-wide">
                    Collected (30d)
                  </div>
                  <div className="mt-2">
                    <div className="text-4xl font-bold text-blue-800">
                      {stats.last30}
                    </div>
                    <div className="text-blue-600 text-sm mt-1">
                      Recently completed
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 bg-blue-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-blue-800 font-bold text-2xl">
                    {stats.last30}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="h-auto p-0 text-blue-700 hover:text-blue-800 hover:bg-blue-200/50 mt-4 rounded-xl"
                onClick={() => applyStatFilter("completed30")}
              >
                View completed →
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 overflow-hidden group">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div className="z-10 relative">
                  <div className="text-purple-700 font-medium text-sm uppercase tracking-wide">
                    Total Diaries
                  </div>
                  <div className="mt-2">
                    <div className="text-4xl font-bold text-purple-800">
                      {rows?.length || 0}
                    </div>
                    <div className="text-purple-600 text-sm mt-1">
                      All time records
                    </div>
                  </div>
                </div>
                <div className="w-16 h-16 bg-purple-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-purple-800 font-bold text-2xl">
                    {rows?.length || 0}
                  </div>
                </div>
              </div>
              <div className="text-purple-600 text-xs mt-4">
                Complete history
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Enhanced Filter/Search Section - optimized for wide screens */}
      <Card className="rounded-3xl border-0 shadow-lg mb-8 bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-6">
          <div className="mb-4">
            <CardTitle className="text-xl font-bold text-gray-900 mb-2">
              Search & Filter Diaries
            </CardTitle>
            <CardDescription className="text-gray-600">
              Find customer diaries by name, email, phone, enquiry, account
              number, or tags
            </CardDescription>
          </div>

          {/* Primary search row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                className="pl-12 h-12 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                placeholder="Search by customer name, email, phone, enquiry, account #…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant={overdueOnly ? "default" : "outline"}
              className={cn(
                "h-12 px-6 transition-all duration-300 hover:scale-105 rounded-xl font-medium",
                overdueOnly
                  ? "bg-red-600 hover:bg-red-700 shadow-lg"
                  : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
              )}
              onClick={() => setOverdueOnly((v) => !v)}
            >
              <Filter className="h-5 w-5 mr-2" />
              {overdueOnly ? "Overdue Only" : "Show Overdue"}
            </Button>
          </div>

          {/* Filter controls - 2 rows for better organization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Row 1: Status, Priority, Payment */}
            <div className="flex items-center gap-4">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-12 w-[180px] border-2 rounded-xl">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-12 w-[160px] border-2 rounded-xl">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paid} onValueChange={setPaid}>
                <SelectTrigger className="h-12 w-[140px] border-2 rounded-xl">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Staff, Dates, Tags */}
            <div className="flex items-center gap-4">
              <Select value={staff} onValueChange={setStaff}>
                <SelectTrigger className="h-12 w-[180px] border-2 rounded-xl">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start h-12 font-normal w-[140px] border-2 rounded-xl"
                    >
                      {fromDate ? format(fromDate, "dd MMM") : "From"}
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

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start h-12 font-normal w-[140px] border-2 rounded-xl"
                    >
                      {toDate ? format(toDate, "dd MMM") : "To"}
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
                className="h-12 w-[200px] border-2 rounded-xl"
                placeholder="Tags: urgent, warranty..."
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Diary Cards Grid - optimized for 1920px width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white border-0 rounded-3xl h-48 shadow-lg"
            />
          ))}

        {!loading && filtered.length === 0 && (
          <Card className="rounded-3xl border-0 shadow-lg col-span-full bg-gradient-to-r from-gray-50 to-gray-100">
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Search className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No diaries found
              </h3>
              <p className="text-gray-500">
                No diaries match your current filters. Try adjusting your search
                criteria, status, or date range.
              </p>
            </CardContent>
          </Card>
        )}

        <AnimatePresence>
          {!loading &&
            filtered.map((d) => (
              <motion.div
                key={d.id}
                variants={fadeIn}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white group">
                  <CardContent className="p-6">
                    {/* Header with customer info and badges */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-lg text-gray-900 truncate mb-1">
                          {d.customer?.name || "Customer"}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {d.customer?.email ||
                            d.customer?.phone ||
                            d.customer?.accountNo}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={d.status as Status} />
                        <PriorityBadge priority={d.priority as Priority} />
                      </div>
                    </div>

                    {/* Enquiry content */}
                    <div className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                      {d.whatTheyWant || "No enquiry details provided"}
                    </div>

                    {/* Meta information */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Total:</span>
                        <span className="font-semibold text-gray-900">
                          ${String(d.total ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Created:</span>
                        <span className="text-gray-700">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {d.staff && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Staff:</span>
                          <span className="text-gray-700">{d.staff}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Select
                          value={d.status}
                          onValueChange={async (newStatus) => {
                            try {
                              const res = await fetch(`/api/diaries/${d.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: newStatus }),
                              });
                              if (res.ok) {
                                // Update local state immediately for better UX
                                setRows((prev) =>
                                  prev
                                    ? prev.map((row) =>
                                        row.id === d.id
                                          ? {
                                              ...row,
                                              status: newStatus as Status,
                                            }
                                          : row
                                      )
                                    : null
                                );
                              } else {
                                console.error("Failed to update status");
                              }
                            } catch (error) {
                              console.error("Error updating status:", error);
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 w-40 border-2 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/diaries/${d.id}`} className="inline-flex">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:scale-105 transition-all duration-300 rounded-xl font-medium"
                          >
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 hover:scale-105 transition-all duration-300 rounded-xl"
                          onClick={async () => {
                            const res = await fetch(`/api/diaries/${d.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                archivedAt: new Date()
                                  .toISOString()
                                  .split("T")[0],
                              }),
                            });
                            if (res.ok) {
                              // Refresh the dashboard to remove the archived diary
                              fetchDiaries();
                            }
                          }}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
