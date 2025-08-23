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
  Copy,
  Share2,
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
};

// simple deep-equal
const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

export default function DiaryDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, mutate } = useSWR(`/api/diaries/${id}`, fetcher);
  const [dirty, setDirty] = useState(false);

  // local editable state (only existing API fields)
  const [form, setForm] = useState<Patchable | null>(null);

  // UI-only fields for future wiring (won’t be sent today)
  const [tags, setTags] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [invoicePO, setInvoicePO] = useState<string>("");
  const [paidAt, setPaidAt] = useState<string>(""); // yyyy-mm-dd

  // dialogs
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavRef = useRef<null | (() => void)>(null);
  const [needManagerOverride, setNeedManagerOverride] = useState<null | {
    nextStatus: string;
  }>(null);

  useEffect(() => {
    if (!data) return;
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
    };
    setForm(initial);
    setDirty(false);
    // UI-only fields — load if your API later includes them
    setTags(data.tags ?? "");
    setPaymentMethod(data.paymentMethod ?? "");
    setAmountPaid(data.amountPaid ?? "");
    setInvoicePO(data.invoicePO ?? "");
    setPaidAt(data.paidAt ?? "");
  }, [data]);

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
    };
    return obj;
  }, [data]);

  useEffect(() => {
    if (!form || !initialComparable) return;
    setDirty(!isEqual(form, initialComparable));
  }, [form, initialComparable]);

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
    const res = await fetch(`/api/diaries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast({ title: "Saved", duration: 10000 }); // 10 seconds
      await mutate();
      setDirty(false);
    } else {
      const msg = await res.text();
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

  const totals = {
    subtotal: data.subtotal,
    tax: data.tax,
    total: data.total,
    // balance if you wire amountPaid later
    balance: (() => {
      const tot = Number(data.total || 0);
      const paid = Number(amountPaid || 0);
      return (tot - paid).toFixed(2);
    })(),
  };

  const set = <K extends keyof Patchable>(key: K, value: Patchable[K]) =>
    setForm((p) => (p ? { ...p, [key]: value } : p));

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
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between py-3">
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
              <div className="text-lg font-semibold">Diary</div>
              <div className="text-xs text-muted-foreground">
                {data.customer?.name} · {data.customer?.phone}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={form.status as any} />
            <PriorityBadge priority={form.priority as any} />
            <Button variant="outline" asChild className="hidden sm:inline-flex">
              <Link
                href={`/diary/${id}/print`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Printer className="mr-2 h-4 w-4" /> Print
              </Link>
            </Button>
            <Button variant="outline" asChild className="hidden sm:inline-flex">
              <Link
                href={`/diary/${id}/label`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Tag className="mr-2 h-4 w-4" /> Label
              </Link>
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex">
              <Archive className="mr-2 h-4 w-4" /> Archive
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex">
              <Copy className="mr-2 h-4 w-4" /> Duplicate
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button
              onClick={doSave}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Save
            </Button>
          </div>
        </div>
        <Separator />
      </div>

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
                  placeholder="e.g. Christchurch / Riccarton" /* UI only for now */
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
                <Input placeholder="Multiple allowed (UI only)" />
              </div>

              <div className="md:col-span-3">
                <Label className="text-sm font-semibold pb-2">Tags</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
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
            <CardContent className="grid md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Payment method
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Amount paid
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Invoice / PO
                </Label>
                <Input
                  placeholder="e.g. 02600........"
                  value={invoicePO}
                  onChange={(e) => setInvoicePO(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">Paid at</Label>
                <Input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>
              <div className="md:col-span-4 text-right text-sm text-muted-foreground">
                Subtotal ${totals.subtotal} • GST ${totals.tax} • Total $
                {totals.total} •{" "}
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
          <Attachments diaryId={id} initial={data.files || []} />
        </TabsContent>
      </Tabs>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur border-t px-6 py-3 flex items-center justify-between">
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
      </div>

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
