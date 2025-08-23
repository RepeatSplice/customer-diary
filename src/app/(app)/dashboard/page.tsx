// src/app/(app)/dashboard/page.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { Search, Filter, Trash2, Archive } from "lucide-react";

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
  | "Ready for Pickup"
  | "Completed"
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
  "Ready for Pickup",
  "Completed",
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

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/diaries?limit=200")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data: DiaryApiResponse[]) => {
        if (cancelled) return;
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
      })
      .catch((e) => console.error("Failed to fetch diaries:", e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const staffOptions = React.useMemo(() => {
    const s = new Set<string>();
    rows?.forEach((r) => r.staff && s.add(r.staff));
    return Array.from(s);
  }, [rows]);

  const stats = React.useMemo(() => {
    const all = rows ?? [];
    const now = new Date();
    const active = all.filter(
      (r) => !["Completed", "Cancelled"].includes(r.status)
    ).length;
    const overdue = all.filter((r) => {
      if (!r.dueDate) return false;
      return (
        new Date(r.dueDate) < now &&
        !["Completed", "Cancelled"].includes(r.status)
      );
    }).length;
    const last30 = all.filter((r) => {
      if (r.status !== "Completed") return false;
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
              !["Completed", "Cancelled"].includes(r.status)
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
      setStatus("Completed");
      setOverdueOnly(false);
    }
  };

  return (
    <div className="w-full px-6 pb-12">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">
                Active Diaries
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-3xl font-semibold">{stats.active}</div>
                <Button
                  variant="link"
                  className="h-auto p-0 text-green-700"
                  onClick={() => applyStatFilter("active")}
                >
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">Overdue</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-3xl font-semibold">{stats.overdue}</div>
                <Button
                  variant="link"
                  className="h-auto p-0 text-green-700"
                  onClick={() => applyStatFilter("overdue")}
                >
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">
                Completed (30d)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-3xl font-semibold">{stats.last30}</div>
                <Button
                  variant="link"
                  className="h-auto p-0 text-green-700"
                  onClick={() => applyStatFilter("completed30")}
                >
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filter/search bar — full width, search left, quick filters right */}
      <Card className="rounded-2xl border shadow-sm mb-5">
        <CardContent className="p-4">
          {/* Row 1: Search (flex-1) + quick filters to the right */}
          <CardTitle className="text-base font-semibold pb-2">
            Search customer diaries
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground pb-2">
            Search for a customer diary by name, email, phone, enquiry, account
            #, or tags.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 w-full"
                placeholder="Search name, email, phone, enquiry, account #…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: All</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-10 w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Priority: All</SelectItem>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paid} onValueChange={setPaid}>
              <SelectTrigger className="h-10 w-[140px]">
                <SelectValue placeholder="Paid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Paid: All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={staff} onValueChange={setStaff}>
              <SelectTrigger className="h-10 w-[150px]">
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

          {/* Row 2: tags + from/to + overdue toggle */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold">From</Label>
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
              <Label className="text-sm font-semibold">To</Label>
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
              placeholder="Tags e.g. urgent, warranty"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
            />

            <Button
              type="button"
              variant={overdueOnly ? "default" : "outline"}
              className={cn(
                "h-10 ml-auto",
                overdueOnly && "bg-green-600 hover:bg-green-700"
              )}
              onClick={() => setOverdueOnly((v) => !v)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {overdueOnly ? "Overdue only" : "Include overdue filter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading &&
          Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white border rounded-2xl h-36"
            />
          ))}

        {!loading && filtered.length === 0 && (
          <Card className="rounded-2xl border shadow-sm col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              No diaries match your filters. Try changing search, status, or
              dates.
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
              >
                <Card className="rounded-2xl border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {d.customer?.name || "Customer"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
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

                    <div className="text-sm  mt-2 line-clamp-2">
                      {d.whatTheyWant}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <div>
                        Total: ${String(d.total ?? 0)} • Created{" "}
                        {new Date(d.createdAt).toLocaleString()}
                      </div>
                      <div>{d.staff ? `Staff: ${d.staff}` : null}</div>
                    </div>

                    {/* Actions row */}
                    <div className="mt-3 flex items-center justify-between ">
                      <div className="flex items-center gap-2">
                        <Select
                          defaultValue={d.status}
                          onValueChange={() => {}}
                        >
                          <SelectTrigger className="h-9 w-44">
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
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
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
