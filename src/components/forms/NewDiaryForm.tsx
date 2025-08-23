// src/components/forms/NewDiaryForm.tsx
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { UploadCloud, X, Trash } from "lucide-react";
import { FileText } from "lucide-react";

// shadcn/ui
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { ProductEditor } from "@/components/products/ProductEditor";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// ------- Motion (subtle) -------
const page = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
} as const;

const section = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.04 * i, duration: 0.28 },
  }),
} as const;

// ------- Lightweight types -------
interface Customer {
  name: string;
  email: string;
  phone: string;
  accountNo: string;
  preferredContact: "sms" | "call" | "email" | "";
}
interface FlagsState {
  isPaid: boolean;
  isOrdered: boolean;
  hasTextedCustomer: boolean;
  paymentMethod: "cash" | "card" | "bank" | "other" | "";
  amountPaid: string; // keep as string for input
  invoiceOrPO: string;
}

function DraftAttachments({
  value,
  onChange,
}: {
  value: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    onChange([...value, ...Array.from(list)]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        multiple
        onChange={(e) => addFiles(e.target.files)}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 sm:p-8",
          "border-emerald-300/60 bg-emerald-50/40",
          dragActive && "bg-emerald-50 ring-2 ring-emerald-300"
        )}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <UploadCloud className="h-8 w-8" />
          <p className="text-sm">Select files to upload</p>
          <p className="text-xs">Images / PDF — or drop here</p>
        </div>
      </div>
    </>
  );
}

function DraftPreviewGrid({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  // create object URLs for image previews
  const [urls, setUrls] = useState<string[]>([]);
  const [hovering, setHovering] = useState<number | null>(null);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  if (!files.length) return null;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
      {files.map((f, i) => (
        <div
          key={`${f.name}-${i}`}
          className="relative group border rounded-xl overflow-hidden bg-white"
        >
          {/* Top-left X button */}
          <button
            type="button"
            aria-label="Remove attachment"
            onMouseEnter={() => setHovering(i)}
            onMouseLeave={() => setHovering(null)}
            onClick={() => onRemove(i)}
            className="absolute left-2 top-2 z-10 inline-flex items-center justify-center
                       h-7 w-7 rounded-full bg-white/95 border text-slate-700
                        focus:outline-none transition-colors hover:bg-red-500 hover:text-white"
          >
            {hovering === i ? (
              <X className="h-4 w-4" />
            ) : (
              <Trash className="h-4 w-4" />
            )}
          </button>

          {/* Preview */}
          {f.type.startsWith("image/") ? (
            <img
              src={urls[i]}
              alt={f.name}
              className="h-40 w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-40 w-full flex items-center justify-center text-muted-foreground">
              <FileText className="h-8 w-8" />
            </div>
          )}

          {/* Filename */}
          <div className="p-2 text-xs truncate">{f.name}</div>
        </div>
      ))}
    </div>
  );
}

export default function NewDiaryForm() {
  // core state (API contract preserved)
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    accountNo: "",
    preferredContact: "",
  });
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [what, setWhat] = useState("");
  const [priority, setPriority] = useState<
    "Low" | "Normal" | "High" | "Urgent"
  >("Normal");

  // meta
  const [tags, setTags] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [receivedDate, setReceivedDate] = useState<Date | undefined>(
    new Date()
  );
  const [dueDate, setDueDate] = useState<Date | undefined>();

  // order
  const [order, setOrder] = useState({ supplier: "", orderNo: "" });
  const [etaDate, setEtaDate] = useState<Date | undefined>();

  // flags / payment
  const [flags, setFlags] = useState<FlagsState>({
    isPaid: false,
    isOrdered: false,
    hasTextedCustomer: false,
    paymentMethod: "",
    amountPaid: "",
    invoiceOrPO: "",
  });

  // products + notes
  const [products, setProducts] = useState<any[]>([]);
  const [adminNotes, setAdminNotes] = useState("");

  // total (tolerant to shapes used in ProductEditor)
  const total = useMemo(() => {
    try {
      return products.reduce((sum: number, p: any) => {
        const qty = Number(p.qty ?? p.quantity ?? 1);
        const price = Number(p.unitPrice ?? p.price ?? 0);
        const discount = Number(p.discount ?? 0); // %
        const tax = Number(p.tax ?? 0); // %
        const line = qty * price * (1 - discount / 100) * (1 + tax / 100);
        return sum + line;
      }, 0);
    } catch {
      return 0;
    }
  }, [products]);

  async function submit() {
    const payload = {
      customerInline: customer.name ? customer : undefined,
      whatTheyWant: what,
      priority,
      tags,
      storeLocation,

      // ⬇️ change these 3 lines
      dateReceived: sendDate(receivedDate),
      dueDate: sendDate(dueDate),
      eta: sendDate(etaDate),

      isPaid: flags.isPaid,
      isOrdered: flags.isOrdered,
      hasTextedCustomer: flags.hasTextedCustomer,
      paymentMethod: flags.paymentMethod,
      amountPaid: flags.amountPaid,
      invoicePO: flags.invoiceOrPO,

      supplier: order.supplier,
      orderNo: order.orderNo,

      products,
      adminNotes,
    };

    const res = await fetch("/api/diaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const d = await res.json();

      // Upload any draft files now that we have a diary id
      for (const file of draftFiles) {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`/api/diaries/${d.id}/attachments`, {
          method: "POST",
          body: fd,
        });
      }

      toast({ title: "Diary created", description: "Redirecting…" });
      window.location.href = `/diaries/${d.id}`;
    } else {
      // existing error toast
    }
  }

  // ------- UI helpers -------
  const PriorityChip = ({
    value,
  }: {
    value: "Low" | "Normal" | "High" | "Urgent";
  }) => (
    <Badge
      variant="secondary"
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium border",
        value === "Low" && "bg-emerald-50 text-emerald-700 border-emerald-200",
        value === "Normal" && "bg-slate-50 text-slate-700 border-slate-200",
        value === "High" && "bg-amber-50 text-amber-700 border-amber-200",
        value === "Urgent" && "bg-red-50 text-red-700 border-red-200"
      )}
    >
      {value}
    </Badge>
  );

  const sendDate = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : undefined);

  const Chip = ({ val }: { val: "Low" | "Normal" | "High" | "Urgent" }) => (
    <button
      type="button"
      onClick={() => setPriority(val)}
      className={cn(
        "h-9 px-3 rounded-full border transition-colors",
        priority === val
          ? "bg-green-50 border-green-300 text-green-700"
          : "bg-background border-border text-foreground hover:bg-muted/60"
      )}
    >
      {val}
    </button>
  );

  const DateField = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value?: Date;
    onChange: (d?: Date) => void;
  }) => (
    <div className="flex flex-col">
      <Label className="text-sm font-semibold pb-2">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start font-normal h-10">
            {value ? (
              format(value, "dd MMM yyyy")
            ) : (
              <span className="text-muted-foreground">Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-2">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={page}
      className="mx-auto w-full  px-6 pb-28"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          New Customer Diary
        </h1>
        <div className="hidden md:flex items-center gap-2">
          <PriorityChip value={priority} />
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" onClick={() => history.back()}>
            Cancel
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={submit}>
            Create Diary
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Customer */}
        <motion.section variants={section} custom={1}>
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Customer
              </CardTitle>
              <CardDescription>
                Use the below card to add any customer details to the customer
                diary.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid lg:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold pb-2">Name</Label>
                <Input
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">Email</Label>
                <Input
                  type="email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer({ ...customer, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">Phone</Label>
                <Input
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">Account #</Label>
                <Input
                  value={customer.accountNo}
                  onChange={(e) =>
                    setCustomer({ ...customer, accountNo: e.target.value })
                  }
                />
              </div>
              <div className="lg:col-span-2">
                <Label className="text-sm font-semibold pb-2">
                  Preferred contact
                </Label>
                <Select
                  value={customer.preferredContact}
                  onValueChange={(v: any) =>
                    setCustomer({ ...customer, preferredContact: v })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Details */}
        <motion.section variants={section} custom={2}>
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Details</CardTitle>
              <CardDescription>
                Use the below card to add any details about date received, due
                date, store location, and tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid lg:grid-cols-2 gap-4">
              <DateField
                label="Date received"
                value={receivedDate}
                onChange={setReceivedDate}
              />
              <DateField
                label="Due date"
                value={dueDate}
                onChange={setDueDate}
              />
              <div className="lg:col-span-2">
                <Label className="text-sm font-semibold pb-2">
                  Store location
                </Label>
                <Input
                  placeholder="Christchurch / Riccarton"
                  value={storeLocation}
                  onChange={(e) => setStoreLocation(e.target.value)}
                />
              </div>
              <div className="lg:col-span-3">
                <Label className="pb-2 text-sm font-semibold">
                  Tags (comma separated)
                </Label>
                <Input
                  placeholder="urgent, reel, warranty"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Request */}
        <motion.section variants={section} custom={3}>
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Customer Request
              </CardTitle>
              <CardDescription>
                Use the below card to add any the of descriptions, priority, and
                attachments to the customer diary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="pb-2 text-sm font-semibold">
                  Customer Enquiry
                </Label>
                <Textarea
                  placeholder="Need to replace the door handle on my 2000 year old brass monkey fridge..."
                  rows={5}
                  value={what}
                  onChange={(e) => setWhat(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Label className="mr-2 text-md font-semibold">Priority</Label>
                <Chip val="Low" />
                <Chip val="Normal" />
                <Chip val="High" />
                <Chip val="Urgent" />
              </div>

              {/* Attachments: dashed box */}
              <div className="mt-4">
                <DraftAttachments value={draftFiles} onChange={setDraftFiles} />
              </div>

              {/* Newly added attachments preview + X remove */}
              <DraftPreviewGrid
                files={draftFiles}
                onRemove={(index) =>
                  setDraftFiles((prev) => prev.filter((_, i) => i !== index))
                }
              />
            </CardContent>
          </Card>
        </motion.section>

        {/* Flags & Payment */}
        <motion.section variants={section} custom={4}>
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Flags & Payment
              </CardTitle>
              <CardDescription>
                Use the below card to add any flags and payment details to the
                customer diary.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Paid</div>
                  <div className="text-xs text-muted-foreground">
                    Mark when payment received
                  </div>
                </div>
                <Switch
                  checked={flags.isPaid}
                  onCheckedChange={(v) => setFlags({ ...flags, isPaid: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Ordered</div>
                  <div className="text-xs text-muted-foreground">
                    Supplier order placed
                  </div>
                </div>
                <Switch
                  checked={flags.isOrdered}
                  onCheckedChange={(v) => setFlags({ ...flags, isOrdered: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Texted customer</div>
                  <div className="text-xs text-muted-foreground">SMS sent</div>
                </div>
                <Switch
                  checked={flags.hasTextedCustomer}
                  onCheckedChange={(v) =>
                    setFlags({ ...flags, hasTextedCustomer: v })
                  }
                />
              </div>

              <div>
                <Label className="text-sm font-semibold pb-2">
                  Payment method
                </Label>
                <Select
                  value={flags.paymentMethod}
                  onValueChange={(v: any) =>
                    setFlags({ ...flags, paymentMethod: v })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Amount paid
                </Label>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={flags.amountPaid}
                  onChange={(e) =>
                    setFlags({ ...flags, amountPaid: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Invoice / PO
                </Label>
                <Input
                  placeholder="02600........."
                  value={flags.invoiceOrPO}
                  onChange={(e) =>
                    setFlags({ ...flags, invoiceOrPO: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Order details */}
        <motion.section variants={section} custom={5}>
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Order details
              </CardTitle>
              <CardDescription>
                Use the below card to add any order details to the customer
                diary if required, use can add supplier and order number, and
                eta date.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-semibold pb-2">Supplier</Label>
                <Input
                  value={order.supplier}
                  placeholder="Black magic tackle..."
                  onChange={(e) =>
                    setOrder({ ...order, supplier: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">Order #</Label>
                <Input
                  value={order.orderNo}
                  placeholder="02600........."
                  onChange={(e) =>
                    setOrder({ ...order, orderNo: e.target.value })
                  }
                />
              </div>
              <DateField label="ETA" value={etaDate} onChange={setEtaDate} />
            </CardContent>
          </Card>
        </motion.section>

        {/* Products */}
        <motion.section variants={section} custom={6}>
          <ProductEditor value={products} onChange={setProducts} />
        </motion.section>

        {/* Notes */}
        <motion.section variants={section} custom={7}>
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Admin notes
              </CardTitle>
              <CardDescription>
                Use the below card to add any staff notes to the customer diary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Would like to have a look at the product first..."
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </motion.section>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          className="bg-green-600 hover:bg-green-700 w-full h-12 text-md"
          onClick={submit}
        >
          Create
        </Button>
      </div>

      {/* Sticky action (mobile) */}
      <div className="md:hidden fixed inset-x-0 bottom-0 bg-white/90 backdrop-blur border-t p-3 flex items-center gap-2 z-50">
        <div className="text-sm text-muted-foreground flex-1">
          Total ~ ${total.toFixed(2)}
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700 w-36"
          onClick={submit}
        >
          Create Diary
        </Button>
      </div>
    </motion.div>
  );
}
