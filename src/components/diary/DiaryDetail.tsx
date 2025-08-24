"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Tag,
  Archive,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { ProductEditor } from "@/components/products/ProductEditor";
import { Attachments } from "@/components/diary/Attachments";
import { Followups } from "@/components/diary/Followups";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-mobile";

type StaffMember = {
  id: string;
  fullName: string;
  staffCode: string;
  role: "staff" | "manager";
};

const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (response.status === 401) {
    // Redirect to sign-in if unauthorized
    window.location.href = "/sign-in";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Map for pretty labels ↔ enum values
const STATUS_LABELS: Record<string, string> = {
  Pending: "Pending",
  Ordered: "Ordered",
  ReadyForPickup: "Ready for Pickup",
  Collected: "Collected",
  Cancelled: "Cancelled",
};
const STATUS_VALUES = Object.keys(STATUS_LABELS) as Array<
  keyof typeof STATUS_LABELS
>;
const PRIORITIES = ["Low", "Normal", "High", "Urgent"] as const;

type Patchable = {
  status?: string;
  priority?: string;
  isPaid?: boolean;
  isOrdered?: boolean;
  hasTextedCustomer?: boolean;
  whatTheyWant?: string;
  adminNotes?: string;
  dueDate?: string | null; // yyyy-mm-dd
  // Payment fields
  paymentMethod?: string;
  amountPaid?: string; // Keep as string to match database
  invoicePO?: string;
  paidAt?: string | null; // yyyy-mm-dd
  // Additional fields
  storeLocation?: string;
  tags?: string;
  // Total amount
  total?: string;
  // Staff assignment
  assignedTo?: string | null; // UUID of assigned staff member
};

// simple deep-equal
const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

export default function DiaryDetail({ id }: { id: string }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { data, mutate } = useSWR(`/api/diaries/${id}`, fetcher);
  const [dirty, setDirty] = useState(false);

  // Staff data
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // local editable state (only existing API fields)
  const [form, setForm] = useState<Patchable | null>(null);

  // dialogs
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavRef = useRef<null | (() => void)>(null);
  const [needManagerOverride, setNeedManagerOverride] = useState<null | {
    nextStatus: string;
  }>(null);

  useEffect(() => {
    if (!data) return;

    console.log("Initializing form with data:", data);

    // initialize local form from server
    const initial: Patchable = {
      status: data.status,
      priority: data.priority,
      isPaid: data.isPaid,
      isOrdered: data.isOrdered,
      hasTextedCustomer: data.hasTextedCustomer,
      whatTheyWant: data.whatTheyWant,
      adminNotes: data.adminNotes ?? "",
      dueDate: data.dueDate ?? null,
      // Payment fields
      paymentMethod: data.paymentMethod ?? "",
      amountPaid: data.amountPaid ?? "",
      invoicePO: data.invoicePO ?? "",
      paidAt: data.paidAt ?? null,
      // Additional fields
      storeLocation: data.storeLocation ?? "",
      tags: data.tags ?? "",
      // Total amount
      total: data.total ?? "",
      // Staff assignment
      assignedTo: data.assignedTo ?? null,
    };

    console.log("Setting initial form state:", initial);
    setForm(initial);
    setDirty(false);
  }, [data]);

  // Fetch staff members on component mount
  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await fetch("/api/staff-users?public=true");
        if (res.ok) {
          const data = await res.json();
          setStaffMembers(data.items || []);
        } else {
          console.error("Failed to fetch staff members");
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
      } finally {
        setIsLoadingStaff(false);
      }
    }

    fetchStaff();
  }, []);

  // detect dirty
  const initialComparable = useMemo(() => {
    if (!data) return null;
    const obj: Patchable = {
      status: data.status,
      priority: data.priority,
      isPaid: data.isPaid,
      isOrdered: data.isOrdered,
      hasTextedCustomer: data.hasTextedCustomer,
      whatTheyWant: data.whatTheyWant,
      adminNotes: data.adminNotes ?? "",
      dueDate: data.dueDate ?? null,
      // Payment fields
      paymentMethod: data.paymentMethod ?? "",
      amountPaid: data.amountPaid ?? "",
      invoicePO: data.invoicePO ?? "",
      paidAt: data.paidAt ?? null,
      // Additional fields
      storeLocation: data.storeLocation ?? "",
      tags: data.tags ?? "",
      // Total amount
      total: data.total ?? "",
      // Staff assignment
      assignedTo: data.assignedTo ?? null,
    };
    return obj;
  }, [data]);

  useEffect(() => {
    if (!form || !initialComparable) return;
    setDirty(!isEqual(form, initialComparable));
  }, [form, initialComparable]);

  // Debug: log form changes
  useEffect(() => {
    console.log("Form state changed:", form);
  }, [form]);

  // ---- Unsaved-changes guard ----
  // browser refresh / close
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  // browser back key / history pop
  useEffect(() => {
    const onPop = () => {
      if (!dirty) return;
      // immediately push state back and open confirm
      history.pushState(null, "", location.href);
      setShowLeaveConfirm(true);
      pendingNavRef.current = () => history.back();
    };
    // push a marker so back fires popstate
    history.pushState(null, "", location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dirty]);

  async function doSave() {
    if (!form) return;

    console.log("Saving form data:", form);

    const res = await fetch(`/api/diaries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    console.log("Save response status:", res.status);

    // Handle unauthorized access
    if (res.status === 401) {
      toast({
        title: "Session expired",
        description: "Please sign in again",
        variant: "destructive",
        duration: 5000,
      });
      window.location.href = "/sign-in";
      return;
    }

    if (res.ok) {
      const responseData = await res.json();
      console.log("Save successful:", responseData);
      toast({ title: "Saved", duration: 10000 }); // 10 seconds
      await mutate();
      setDirty(false);
    } else {
      const msg = await res.text();
      console.error("Save failed:", msg);
      toast({
        title: "Save failed",
        description: msg || "Check fields and try again",
        variant: "destructive",
        duration: 15000, // 15 seconds
      });
    }
  }

  function backClicked() {
    if (dirty) {
      setShowLeaveConfirm(true);
      pendingNavRef.current = () => router.back();
    } else {
      router.back();
    }
  }

  if (!data || !form) return <div className="px-6 py-10">Loading…</div>;

  // Show loading while checking authentication
  if (isLoading)
    return <div className="px-6 py-10">Checking authentication…</div>;

  // Redirect if not authenticated (this will be handled by useAuth hook)
  if (!isAuthenticated) return null;

  const totals = {
    subtotal: data.subtotal,
    total: form?.total || data.total,
    // balance if you wire amountPaid later
    balance: (() => {
      const tot = Number(form?.total || data.total || 0);
      const paid = Number(form?.amountPaid || "0");
      return (tot - paid).toFixed(2);
    })(),
  };

  const set = <K extends keyof Patchable>(key: K, value: Patchable[K]) => {
    console.log(`Setting ${key} to:`, value);
    setForm((p) => {
      if (!p) return p;
      const newForm = { ...p, [key]: value };
      console.log("New form state:", newForm);
      return newForm;
    });
  };

  function onStatusChange(next: string) {
    // Manager override if marking Collected while not paid
    if (next === "Collected" && !form?.isPaid) {
      setNeedManagerOverride({ nextStatus: next });
      return;
    }
    set("status", next);
  }

  return (
    <div className="w-full px-6 pb-24">
      {/* Sticky header */}
      <Card className="sticky top-0 z-10">
        <CardContent className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={backClicked}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="text-lg font-semibold">
                  Diary Detail for {data.customer?.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={form.status as any} />
              <PriorityBadge priority={form.priority as any} />
              <Button
                variant="outline"
                asChild
                className="hidden sm:inline-flex"
              >
                <Link
                  href={`/diary/${id}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="hidden sm:inline-flex"
              >
                <Link
                  href={`/diary/${id}/label`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Tag className="mr-2 h-4 w-4" /> Label
                </Link>
              </Button>
              <Button
                variant="outline"
                className="hidden sm:inline-flex"
                onClick={async () => {
                  const res = await fetch(`/api/diaries/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      archivedAt: new Date().toISOString().split("T")[0],
                    }),
                  });
                  if (res.ok) {
                    toast({
                      title: "Diary archived",
                      description: "Redirecting to archives...",
                    });
                    setTimeout(() => router.push("/archives"), 1000);
                  } else {
                    toast({ title: "Archive failed", variant: "destructive" });
                  }
                }}
              >
                <Archive className="mr-2 h-4 w-4" /> Archive
              </Button>
              <Button
                onClick={doSave}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Save
              </Button>
            </div>
          </div>
          <Separator className="my-2" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="mt-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="files">Attachments</TabsTrigger>
        </TabsList>

        {/* SUMMARY */}
        <TabsContent value="summary" className="space-y-4">
          {/* Status & Flags */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle>Status & Flags</CardTitle>
              <CardDescription>
                Set the status and priority of the customer diary.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-semibold pb-2">Status</Label>
                <Select value={form.status} onValueChange={onStatusChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-semibold pb-2">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => set("priority", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!form.isPaid}
                    onCheckedChange={(v) => set("isPaid", v)}
                    id="paid"
                  />
                  <Label className="text-sm font-semibold" htmlFor="paid">
                    Paid
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!form.isOrdered}
                    onCheckedChange={(v) => set("isOrdered", v)}
                    id="ordered"
                  />
                  <Label className="text-sm font-semibold " htmlFor="ordered">
                    Ordered
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!form.hasTextedCustomer}
                    onCheckedChange={(v) => set("hasTextedCustomer", v)}
                    id="texted"
                  />
                  <Label className="text-sm font-semibold" htmlFor="texted">
                    Texted
                  </Label>
                </div>
              </div>

              {/* Row 2: Dates */}
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Date received
                </Label>
                <Input
                  value={new Date(data.createdAt).toLocaleString()}
                  disabled
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate ?? ""}
                  onChange={(e) => set("dueDate", e.target.value || null)}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">Order date</Label>
                <Input
                  value={
                    data.updatedAt
                      ? new Date(data.updatedAt).toLocaleDateString()
                      : ""
                  }
                  disabled
                />
              </div>

              {/* Row 3: Meta */}
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Store location
                </Label>
                <Input
                  value={form.storeLocation || ""}
                  onChange={(e) => set("storeLocation", e.target.value)}
                  placeholder="e.g. Christchurch / Riccarton"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">Created by</Label>
                <Input value={data.createdByCode ?? "—"} disabled />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Assigned to
                </Label>
                <Select
                  value={form.assignedTo || "none"}
                  disabled={isLoadingStaff}
                  onValueChange={(value) => {
                    set("assignedTo", value === "none" ? null : value);
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue
                      placeholder={
                        isLoadingStaff
                          ? "Loading staff..."
                          : "Select staff member"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No staff assigned</SelectItem>
                    {staffMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.staffCode} - {member.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <Label className="text-sm font-semibold pb-2">Tags</Label>
                <Input
                  value={form.tags || ""}
                  onChange={(e) => set("tags", e.target.value)}
                  placeholder="urgent, warranty"
                />
              </div>
            </CardContent>
          </Card>

          {/* Request & Notes */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle>Request & Notes</CardTitle>
              <CardDescription>
                Add any additional notes or requests from the customer.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-sm font-semibold pb-2">
                  Customer Enquiry
                </Label>
                <Textarea
                  rows={4}
                  value={form.whatTheyWant || ""}
                  onChange={(e) => set("whatTheyWant", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-semibold pb-2">
                  Admin notes
                </Label>
                <Textarea
                  rows={4}
                  value={form.adminNotes || ""}
                  onChange={(e) => set("adminNotes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>
                Add the payment details for the customer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment method on its own row */}
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Payment method
                </Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(value) => set("paymentMethod", value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Other payment fields in a grid */}
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-semibold pb-2">
                    Amount paid
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    inputMode="decimal"
                    value={form.amountPaid}
                    onChange={(e) => set("amountPaid", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold pb-2">
                    Invoice / PO
                  </Label>
                  <Input
                    placeholder="e.g. 02600........"
                    value={form.invoicePO}
                    onChange={(e) => set("invoicePO", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold pb-2">Paid at</Label>
                  <Input
                    type="date"
                    value={form.paidAt ?? ""}
                    onChange={(e) => set("paidAt", e.target.value || null)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold pb-2">
                    Total amount
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    inputMode="decimal"
                    value={form.total}
                    onChange={(e) => set("total", e.target.value)}
                  />
                </div>
              </div>

              {/* Summary line */}
              <div className="text-right text-sm text-muted-foreground">
                Subtotal ${totals.subtotal} • Total ${totals.total} •{" "}
                <span className="font-medium">Balance ${totals.balance}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRODUCTS */}
        <TabsContent value="products">
          <ProductEditor
            value={data.products || []}
            onChange={async (list) => {
              await fetch(`/api/diaries/${id}/products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(list),
              });
              toast({ title: "Products saved", duration: 15000 }); // 15 seconds
              mutate();
            }}
          />
        </TabsContent>

        {/* FOLLOW-UPS */}
        <TabsContent value="followups">
          <Followups diaryId={id} initial={data.followups || []} />
        </TabsContent>

        {/* FILES */}
        <TabsContent value="files">
          <Attachments diaryId={id} initial={data?.attachments || []} />
        </TabsContent>
      </Tabs>

      {/* Sticky bottom bar */}
      <Card className="mt-6">
        <CardContent className="px-6 py-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {dirty ? (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                You have unsaved changes.
              </>
            ) : (
              <>All changes saved.</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={backClicked}>
              Back
            </Button>
            <Button
              onClick={doSave}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leave without saving? */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have changes that haven’t been saved. If you leave now,
              they’ll be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setShowLeaveConfirm(false);
                const go = pendingNavRef.current;
                pendingNavRef.current = null;
                if (go) go();
              }}
            >
              Leave without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manager override for Collected while not paid */}
      <AlertDialog
        open={!!needManagerOverride}
        onOpenChange={(v) => !v && setNeedManagerOverride(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Manager override required
            </AlertDialogTitle>
            <AlertDialogDescription>
              Marking as <strong>Collected</strong> while not paid requires a
              manager override. Continue anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (needManagerOverride)
                  set("status", needManagerOverride.nextStatus);
                setNeedManagerOverride(null);
              }}
            >
              Override & continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
