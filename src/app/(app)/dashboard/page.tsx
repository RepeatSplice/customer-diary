// src/app/(app)/dashboard/page.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Archive,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  Hash,
  Clock,
} from "lucide-react";

// shadcn/ui
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  assignedTo?: string | null; // assigned staff member
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
  assignedTo?: string | null;
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
  const [activeRows, setActiveRows] = React.useState<DiaryRow[] | null>(null);
  const [archivedRows, setArchivedRows] = React.useState<DiaryRow[] | null>(
    null
  );
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

  // pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 12;

  const debouncedSearch = useDebounced(search, 250);

  const fetchDiaries = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both active and archived diaries
      const [activeRes, archivedRes] = await Promise.all([
        fetch("/api/diaries?archived=0&limit=200"),
        fetch("/api/diaries?archived=1&limit=200"),
      ]);

      if (!activeRes.ok) throw new Error(await activeRes.text());
      if (!archivedRes.ok) throw new Error(await archivedRes.text());

      const activeData: DiaryApiResponse[] = await activeRes.json();
      const archivedData: DiaryApiResponse[] = await archivedRes.json();

      const mapData = (data: DiaryApiResponse[]): DiaryRow[] =>
        data.map((d: DiaryApiResponse) => ({
          id: d.id,
          whatTheyWant: d.whatTheyWant ?? null,
          status: (d.status ?? "Pending") as Status,
          priority: (d.priority ?? "Normal") as Priority,
          total: d.total ?? d.subtotal ?? 0,
          createdAt: d.createdAt,
          dueDate: d.dueDate ?? null,
          isPaid: d.isPaid ?? null,
          staff: d.createdByCode ?? d.createdBy ?? null,
          assignedTo: d.assignedTo ?? null,
          customer: d.customer ?? null,
          tags: d.tags ?? null,
        }));

      setActiveRows(mapData(activeData));
      setArchivedRows(mapData(archivedData));
    } catch (e) {
      console.error("Failed to fetch diaries:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    status,
    priority,
    paid,
    staff,
    overdueOnly,
    fromDate,
    toDate,
    debouncedSearch,
    tagQuery,
  ]);

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
    activeRows?.forEach((r) => r.staff && s.add(r.staff));
    return Array.from(s);
  }, [activeRows]);

  const stats = React.useMemo(() => {
    const all = [...(activeRows ?? []), ...(archivedRows ?? [])];
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
    const total = all.length;
    const completed = all.filter((r) => r.status === "Collected").length;
    return { active, overdue, last30, total, completed };
  }, [activeRows, archivedRows]);

  const filtered = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    const tagQ = tagQuery.toLowerCase().trim();

    return (activeRows ?? [])
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
    activeRows,
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

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 max-w-[1400px] mx-auto">
      {/* Header with better spacing for wide screens */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
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

      {/* Enhanced Stat cards - optimized for smaller screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-2xl border-rounded shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 overflow-hidden group h-full">
            <CardContent className="p-4 sm:p-6 relative h-full flex flex-col">
              <div className="flex items-center justify-between flex-1">
                <div className="z-10 relative">
                  <div className="text-emerald-700 font-medium text-xs sm:text-sm uppercase tracking-wide">
                    Active Diaries
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <div className="text-2xl sm:text-4xl font-bold text-emerald-800">
                      {stats.active}
                    </div>
                    <div className="text-emerald-600 text-xs sm:text-sm mt-1">
                      Currently in progress
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-200 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-emerald-800 font-bold text-lg sm:text-2xl">
                    {stats.active}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-2xl border-rounded shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 overflow-hidden group h-full">
            <CardContent className="p-4 sm:p-6 relative h-full flex flex-col">
              <div className="flex items-center justify-between flex-1">
                <div className="z-10 relative">
                  <div className="text-red-700 font-medium text-xs sm:text-sm uppercase tracking-wide">
                    Overdue
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <div className="text-2xl sm:text-4xl font-bold text-red-800">
                      {stats.overdue}
                    </div>
                    <div className="text-red-600 text-xs sm:text-sm mt-1">
                      Requires attention
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-200 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-red-800 font-bold text-lg sm:text-2xl">
                    {stats.overdue}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-2xl border-rounded shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 overflow-hidden group h-full">
            <CardContent className="p-4 sm:p-6 relative h-full flex flex-col">
              <div className="flex items-center justify-between flex-1">
                <div className="z-10 relative">
                  <div className="text-blue-700 font-medium text-xs sm:text-sm uppercase tracking-wide">
                    Completed
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <div className="text-2xl sm:text-4xl font-bold text-blue-800">
                      {stats.completed}
                    </div>
                    <div className="text-blue-600 text-xs sm:text-sm mt-1">
                      All time completed
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-200 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-blue-800 font-bold text-lg sm:text-2xl">
                    {stats.completed}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card className="rounded-2xl border-rounded shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 overflow-hidden group h-full">
            <CardContent className="p-4 sm:p-6 relative h-full flex flex-col">
              <div className="flex items-center justify-between flex-1">
                <div className="z-10 relative">
                  <div className="text-purple-700 font-medium text-xs sm:text-sm uppercase tracking-wide">
                    Total Diaries
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <div className="text-2xl sm:text-4xl font-bold text-purple-800">
                      {stats.total}
                    </div>
                    <div className="text-purple-600 text-xs sm:text-sm mt-1">
                      All time records
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-200 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-purple-800 font-bold text-lg sm:text-2xl">
                    {stats.total}
                  </div>
                </div>
              </div>
              <div className="text-purple-600 text-xs mt-3 sm:mt-4">
                Complete history
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Enhanced Filter/Search Section - optimized for smaller screens */}
      <Card className="rounded-2xl border-rounded shadow-lg mb-6 sm:mb-8 bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4">
            <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Search & Filter Diaries
            </CardTitle>
            <CardDescription className="text-gray-600 text-sm">
              Find customer diaries by name, email, phone, enquiry, account
              number, or tags
            </CardDescription>
          </div>

          {/* Primary search row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <Input
                className="pl-10 sm:pl-12 h-11 sm:h-12 text-base sm:text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                placeholder="Search by customer name, email, phone, enquiry, account #…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant={overdueOnly ? "default" : "outline"}
              className={cn(
                "h-11 sm:h-12 px-4 sm:px-6 transition-all duration-300 hover:scale-105 rounded-xl font-medium text-sm sm:text-base",
                overdueOnly
                  ? "bg-red-600 hover:bg-red-700 shadow-lg"
                  : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
              )}
              onClick={() => setOverdueOnly((v) => !v)}
            >
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              {overdueOnly ? "Overdue Only" : "Show Overdue"}
            </Button>
          </div>

          {/* Filter controls - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 sm:h-12 border-2 rounded-xl text-sm [&[data-state=open]>svg]:rotate-180">
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
              <SelectTrigger className="h-11 sm:h-12 border-2 rounded-xl text-sm [&[data-state=open]>svg]:rotate-180">
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
              <SelectTrigger className="h-11 sm:h-12 border-2 rounded-xl text-sm [&[data-state=open]>svg]:rotate-180">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={staff} onValueChange={setStaff}>
              <SelectTrigger className="h-11 sm:h-12 border-2 rounded-xl text-sm [&[data-state=open]>svg]:rotate-180">
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
                    className="justify-start h-11 sm:h-12 font-normal flex-1 border-2 rounded-xl text-sm"
                  >
                    {fromDate ? format(fromDate, "dd MMM") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-2">
                  <CalendarComponent
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
                    className="justify-start h-11 sm:h-12 font-normal flex-1 border-2 rounded-xl text-sm"
                  >
                    {toDate ? format(toDate, "dd MMM") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-2">
                  <CalendarComponent
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Input
              className="h-11 sm:h-12 border-2 rounded-xl text-sm"
              placeholder="Tags: urgent, warranty..."
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results count and pagination info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of{" "}
          {filtered.length} diaries
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-9 px-3 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="h-9 w-9 p-0 rounded-lg"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="h-9 px-3 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Enhanced Diary Cards Grid - 2 columns with optimized content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white border-rounded rounded-2xl h-48 sm:h-52 shadow-lg"
            />
          ))}

        {!loading && filtered.length === 0 && (
          <Card className="rounded-2xl border-rounded shadow-lg col-span-full bg-gradient-to-r from-gray-50 to-gray-100">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Search className="h-12 w-12 sm:h-16 sm:w-16 mx-auto" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                No diaries found
              </h3>
              <p className="text-gray-500 text-sm sm:text-base">
                No diaries match your current filters. Try adjusting your search
                criteria, status, or date range.
              </p>
            </CardContent>
          </Card>
        )}

        <AnimatePresence>
          {!loading &&
            paginatedData.map((d) => (
              <motion.div
                key={d.id}
                variants={fadeIn}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-2xl border-rounded shadow-lg hover:shadow-xl transition-all duration-300 bg-white group h-full">
                  <CardContent className="p-4 sm:p-6 h-full flex flex-col">
                    {/* Header with customer info and badges */}
                    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-base sm:text-lg text-gray-900 truncate mb-1">
                          {d.customer?.name || "Customer"}
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                          {d.customer?.email && (
                            <div className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-[150px]">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {d.customer.email}
                              </span>
                            </div>
                          )}
                          {d.customer?.phone && (
                            <div className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-[150px]">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {d.customer.phone}
                              </span>
                            </div>
                          )}
                          {d.customer?.accountNo && (
                            <div className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-[150px]">
                              <Hash className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {d.customer.accountNo}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <StatusBadge status={d.status as Status} />
                        <PriorityBadge priority={d.priority as Priority} />
                      </div>
                    </div>

                    {/* Enquiry content */}
                    <div className="text-sm text-gray-700 mb-3 sm:mb-4 line-clamp-3 leading-relaxed flex-1">
                      {d.whatTheyWant
                        ? truncateText(d.whatTheyWant, 100)
                        : "No enquiry details provided"}
                    </div>

                    {/* Meta information - compact layout */}
                    <div className="space-y-2 mb-3 sm:mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <DollarSign className="h-3 w-3" />
                          <span>Total:</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          ${String(d.total ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Created:</span>
                        </div>
                        <span className="text-gray-700">
                          {new Date(d.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {d.dueDate && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>Due:</span>
                          </div>
                          <span
                            className={cn(
                              "text-gray-700",
                              new Date(d.dueDate) < new Date() &&
                                !["Collected", "Cancelled"].includes(d.status)
                                ? "text-red-600 font-medium"
                                : ""
                            )}
                          >
                            {new Date(d.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {d.staff && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-gray-500">
                            <User className="h-3 w-3" />
                            <span>Created by:</span>
                          </div>
                          <span className="text-gray-700">{d.staff}</span>
                        </div>
                      )}
                      {d.assignedTo && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-gray-500">
                            <User className="h-3 w-3" />
                            <span>Assigned to:</span>
                          </div>
                          <span className="text-gray-700">{d.assignedTo}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100 mt-auto">
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
                                setActiveRows((prev) =>
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
                          <SelectTrigger className="h-9 w-32 sm:w-40 border-2 rounded-xl text-xs sm:text-sm [&[data-state=open]>svg]:rotate-180">
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
                            className="h-9 px-3 sm:px-4 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:scale-105 transition-all duration-300 rounded-xl font-medium text-xs sm:text-sm"
                          >
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 hover:scale-105 transition-all duration-300 rounded-xl"
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
