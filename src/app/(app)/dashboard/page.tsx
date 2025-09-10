// src/app/(app)/dashboard/page.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  X,
  Tag,
  RotateCcw,
  Eye,
  FileText,
  CreditCard,
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
import { toast } from "@/components/ui/use-toast";

import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";

// ---------- Types ----------
export type Status =
  | "Pending"
  | "Ordered"
  | "Ready"
  | "Waiting"
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
  "Ready",
  "Waiting",
  "Collected",
  "Cancelled",
];
const PRIORITY_OPTIONS: Priority[] = ["Low", "Normal", "High", "Urgent"];

// ---------- Page ----------
export default function DashboardPage() {
  const router = useRouter();
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
  const [itemsPerPage, setItemsPerPage] = React.useState(12);
  const [updatingStatus, setUpdatingStatus] = React.useState<string | null>(
    null
  );
  const [archiving, setArchiving] = React.useState<string | null>(null);

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

  // Click handlers for stats cards
  const handleActiveClick = React.useCallback(() => {
    // Filter for active statuses (non-completed/cancelled)
    setStatus("all");
    setPriority("all");
    setPaid("all");
    setStaff("all");
    setOverdueOnly(false);
    setFromDate(undefined);
    setToDate(undefined);
    setSearch("");
    setTagQuery("");
    // This will show all active diaries (pending, ordered, ready for pickup)
  }, []);

  const handleOverdueClick = React.useCallback(() => {
    // Toggle overdue filter
    setOverdueOnly(!overdueOnly);
    // Clear other filters to focus on overdue items
    if (!overdueOnly) {
      setStatus("all");
      setPriority("all");
      setPaid("all");
      setStaff("all");
      setFromDate(undefined);
      setToDate(undefined);
      setSearch("");
      setTagQuery("");
    }
  }, [overdueOnly]);

  const handleCompletedClick = React.useCallback(() => {
    // Navigate to archives page to show completed items
    router.push("/archives");
  }, [router]);

  // Clear all filters
  const clearAllFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setPriority("all");
    setPaid("all");
    setStaff("all");
    setOverdueOnly(false);
    setFromDate(undefined);
    setToDate(undefined);
    setTagQuery("");
  }, []);

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (status !== "all") count++;
    if (priority !== "all") count++;
    if (paid !== "all") count++;
    if (staff !== "all") count++;
    if (overdueOnly) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (tagQuery.trim()) count++;
    return count;
  }, [
    search,
    status,
    priority,
    paid,
    staff,
    overdueOnly,
    fromDate,
    toDate,
    tagQuery,
  ]);

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

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 max-w-[1400px] mx-auto bg-white min-h-screen">
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
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:scale-105 transition-all duration-300 shadow-sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Enhanced Stat cards - optimized for smaller screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card
            className="rounded-2xl border-rounded shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 overflow-hidden group h-full cursor-pointer"
            onClick={handleActiveClick}
          >
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
              <div className="text-emerald-600 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Click to filter active diaries
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card
            className="rounded-2xl border-rounded shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 overflow-hidden group h-full cursor-pointer"
            onClick={handleOverdueClick}
          >
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
              <div className="text-red-600 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {overdueOnly
                  ? "Click to show all diaries"
                  : "Click to filter overdue"}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show">
          <Card
            className="rounded-2xl border-rounded shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 overflow-hidden group h-full cursor-pointer"
            onClick={handleCompletedClick}
          >
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
              <div className="text-blue-600 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Click to view archives
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

      {/* Enhanced Search & Filter Section */}
      <Card className="rounded-2xl shadow-lg mb-6 sm:mb-8 bg-white border border-slate-200">
        <CardContent className="p-6">
          {/* Header with Clear Filters */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter Diaries
                {activeFiltersCount > 0 && (
                  <span className="inline-flex items-center justify-center h-6 w-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-slate-600 mt-1">
                Find diaries by customer details, status, dates, or tags
              </CardDescription>
            </div>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-slate-600 hover:text-slate-800 border-slate-300 hover:border-slate-400"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Primary Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                className="pl-12 h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl bg-white shadow-sm"
                placeholder="Search customers by name, email, phone, enquiry, or account number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm font-medium text-slate-600 mr-2">
              Quick filters:
            </span>
            <Button
              variant={overdueOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setOverdueOnly((v) => !v)}
              className={cn(
                "h-8 px-3 text-xs font-medium rounded-lg transition-all",
                overdueOnly
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-md"
                  : "border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
              )}
            >
              <Clock className="h-3 w-3 mr-1" />
              Overdue
              {stats.overdue > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-xs">
                  {stats.overdue}
                </span>
              )}
            </Button>
          </div>

          {/* Detailed Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 border-slate-300 rounded-lg text-sm bg-white">
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
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10 border-slate-300 rounded-lg text-sm bg-white">
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
            </div>

            {/* Payment Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Payment
              </label>
              <Select value={paid} onValueChange={setPaid}>
                <SelectTrigger className="h-10 border-slate-300 rounded-lg text-sm bg-white">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Staff Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <User className="h-3 w-3" />
                Staff
              </label>
              <Select value={staff} onValueChange={setStaff}>
                <SelectTrigger className="h-10 border-slate-300 rounded-lg text-sm bg-white">
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
            </div>

            {/* Date Range */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date Range
              </label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start h-10 font-normal flex-1 border-slate-300 rounded-lg text-sm bg-white",
                        fromDate && "text-slate-900"
                      )}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {fromDate ? format(fromDate, "dd MMM yyyy") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <CalendarComponent
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start h-10 font-normal flex-1 border-slate-300 rounded-lg text-sm bg-white",
                        toDate && "text-slate-900"
                      )}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {toDate ? format(toDate, "dd MMM yyyy") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <CalendarComponent
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Tags Filter */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Tags
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-10 h-10 border-slate-300 rounded-lg text-sm bg-white"
                  placeholder="Filter by tags: urgent, warranty, vip..."
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                />
                {tagQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100"
                    onClick={() => setTagQuery("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeFiltersCount > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">Active filters:</span>
                <div className="flex flex-wrap gap-1">
                  {search && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                      Search: &ldquo;{search}&rdquo;
                    </span>
                  )}
                  {status !== "all" && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
                      Status: {status}
                    </span>
                  )}
                  {priority !== "all" && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs">
                      Priority: {priority}
                    </span>
                  )}
                  {paid !== "all" && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs">
                      Payment: {paid}
                    </span>
                  )}
                  {staff !== "all" && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs">
                      Staff: {staff}
                    </span>
                  )}
                  {overdueOnly && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs">
                      Overdue only
                    </span>
                  )}
                  {fromDate && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md text-xs">
                      From: {format(fromDate, "dd MMM")}
                    </span>
                  )}
                  {toDate && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md text-xs">
                      To: {format(toDate, "dd MMM")}
                    </span>
                  )}
                  {tagQuery && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs">
                      Tags: {tagQuery}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600 font-medium">
            {filtered.length > 0 ? (
              <>
                Showing{" "}
                <span className="text-slate-900 font-semibold">
                  {startIndex + 1}-{Math.min(endIndex, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="text-slate-900 font-semibold">
                  {filtered.length}
                </span>{" "}
                diaries
              </>
            ) : (
              "No diaries found"
            )}
          </div>
          {filtered.length !== (activeRows?.length || 0) && activeRows && (
            <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {activeRows.length - filtered.length} filtered out
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Items per page selector */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Show:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(Number(value))}
            >
              <SelectTrigger className="h-8 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
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
                      className="h-8 w-8 p-0 text-xs"
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
                className="h-8 px-2 text-xs"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Diary Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Loading Skeletons */}
        {loading &&
          Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <Card className="rounded-2xl h-80 border border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-2 flex-1">
                      <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
                      <div className="h-6 w-12 bg-slate-200 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-3 bg-slate-200 rounded"></div>
                    <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                    <div className="h-3 bg-slate-200 rounded w-3/5"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <Card className="rounded-2xl border border-slate-200 col-span-full bg-white">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                No diaries found
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                No diaries match your current filters. Try adjusting your search
                criteria, status, or date range.
              </p>
              <Button
                variant="outline"
                onClick={clearAllFilters}
                className="mt-4"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Diary Cards */}
        <AnimatePresence>
          {!loading &&
            paginatedData.map((d) => (
              <motion.div
                key={d.id}
                variants={fadeIn}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white h-full flex flex-col">
                  <CardContent className="p-6 flex flex-col h-full">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg text-slate-900 leading-tight line-clamp-1">
                              {d.customer?.name || "Unknown Customer"}
                            </h3>
                            <p className="text-sm text-slate-500">
                              #{d.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <StatusBadge status={d.status as Status} />
                        <PriorityBadge priority={d.priority as Priority} />
                      </div>
                    </div>

                    {/* Contact Info Grid - Enhanced */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <Card className="border border-slate-200 shadow-sm">
                        <CardContent className="p-3 text-center">
                          <Mail className="h-4 w-4 text-blue-500 mx-auto mb-2" />
                          <div className="text-xs font-medium text-slate-500 mb-1">
                            Email
                          </div>
                          <div className="text-xs text-slate-700 line-clamp-2 leading-tight">
                            {d.customer?.email || "Not provided"}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border border-slate-200 shadow-sm">
                        <CardContent className="p-3 text-center">
                          <Phone className="h-4 w-4 text-green-500 mx-auto mb-2" />
                          <div className="text-xs font-medium text-slate-500 mb-1">
                            Phone
                          </div>
                          <div className="text-xs text-slate-700 line-clamp-2 leading-tight">
                            {d.customer?.phone || "Not provided"}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border border-slate-200 shadow-sm">
                        <CardContent className="p-3 text-center">
                          <Hash className="h-4 w-4 text-purple-500 mx-auto mb-2" />
                          <div className="text-xs font-medium text-slate-500 mb-1">
                            Account
                          </div>
                          <div className="text-xs text-slate-700 line-clamp-2 leading-tight">
                            {d.customer?.accountNo || "Not provided"}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Request Details - Fixed Height */}
                    <div className="mb-4">
                      <div className="bg-white border border-slate-200 rounded-lg p-3 h-24 flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Customer Request
                          </h4>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                            {d.whatTheyWant || "No enquiry details provided"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Details Grid - Fixed Height */}
                    <div className="grid grid-cols-4 gap-3 mb-4 h-16">
                      {/* Total */}
                      <div className="text-center bg-white border border-slate-200 rounded-lg p-2 flex flex-col justify-center">
                        <DollarSign className="h-4 w-4 text-green-500 mx-auto mb-1" />
                        <div className="text-xs text-slate-500 mb-1">Total</div>
                        <div className="font-semibold text-green-600 text-sm">
                          ${String(d.total ?? 0)}
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div className="text-center bg-white border border-slate-200 rounded-lg p-2 flex flex-col justify-center">
                        <CreditCard className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                        <div className="text-xs text-slate-500 mb-1">
                          Payment
                        </div>
                        <div
                          className={cn(
                            "text-sm font-medium",
                            d.isPaid ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {d.isPaid ? "Paid" : "Unpaid"}
                        </div>
                      </div>

                      {/* Due Date */}
                      <div className="text-center bg-white border border-slate-200 rounded-lg p-2 flex flex-col justify-center">
                        <Calendar className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <div className="text-xs text-slate-500 mb-1">
                          Due Date
                        </div>
                        <div
                          className={cn(
                            "text-sm font-medium",
                            d.dueDate &&
                              new Date(d.dueDate) < new Date() &&
                              !["Collected", "Cancelled"].includes(d.status)
                              ? "text-red-600"
                              : "text-slate-700"
                          )}
                        >
                          {d.dueDate
                            ? format(new Date(d.dueDate), "dd MMM")
                            : "Not set"}
                        </div>
                      </div>

                      {/* Staff */}
                      <div className="text-center bg-white border border-slate-200 rounded-lg p-2 flex flex-col justify-center">
                        <User className="h-4 w-4 text-purple-500 mx-auto mb-1" />
                        <div className="text-xs text-slate-500 mb-1">Staff</div>
                        <div className="text-sm font-medium text-slate-700 line-clamp-1">
                          {d.staff || "Unassigned"}
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-auto pt-4">
                      <div className="flex items-center gap-3">
                        {/* Status Dropdown */}
                        <div className="flex-1">
                          <Select
                            value={d.status}
                            disabled={updatingStatus === d.id}
                            onValueChange={async (newStatus) => {
                              setUpdatingStatus(d.id);
                              try {
                                const res = await fetch(
                                  `/api/diaries/${d.id}`,
                                  {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ status: newStatus }),
                                  }
                                );

                                if (res.ok) {
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
                                  toast({
                                    title: "Status Updated",
                                    description: `Diary status changed to ${newStatus}`,
                                  });
                                } else {
                                  const errorData = await res
                                    .json()
                                    .catch(() => ({}));
                                  toast({
                                    title: "Error Updating Status",
                                    description:
                                      errorData.message ||
                                      `Failed to update status. Server responded with ${res.status}`,
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                console.error("Error updating status:", error);
                                toast({
                                  title: "Network Error",
                                  description:
                                    "Could not connect to server. Please check your connection and try again.",
                                  variant: "destructive",
                                });
                              } finally {
                                setUpdatingStatus(null);
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 text-sm bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem
                                  key={s}
                                  value={s}
                                  className="text-sm"
                                >
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Link href={`/diaries/${d.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 text-sm bg-white border-slate-200 hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 bg-white border-slate-200 hover:bg-slate-50"
                            disabled={archiving === d.id}
                            onClick={async () => {
                              setArchiving(d.id);
                              try {
                                const res = await fetch(
                                  `/api/diaries/${d.id}`,
                                  {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      archivedAt: new Date()
                                        .toISOString()
                                        .split("T")[0],
                                    }),
                                  }
                                );

                                if (res.ok) {
                                  fetchDiaries();
                                  toast({
                                    title: "Diary Archived",
                                    description:
                                      "The diary has been successfully archived",
                                  });
                                } else {
                                  const errorData = await res
                                    .json()
                                    .catch(() => ({}));
                                  toast({
                                    title: "Error Archiving Diary",
                                    description:
                                      errorData.message ||
                                      `Failed to archive diary. Server responded with ${res.status}`,
                                    variant: "destructive",
                                  });
                                }
                              } catch (error) {
                                console.error("Error archiving diary:", error);
                                toast({
                                  title: "Network Error",
                                  description:
                                    "Could not connect to server. Please check your connection and try again.",
                                  variant: "destructive",
                                });
                              } finally {
                                setArchiving(null);
                              }
                            }}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
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
