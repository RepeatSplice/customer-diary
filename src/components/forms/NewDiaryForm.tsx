// src/components/forms/NewDiaryForm.tsx
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { format } from "date-fns";
import { Trash, FileText, Upload, X, Info } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

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
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
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
import CustomerSearch from "@/components/customers/CustomerSearch";
import QuickCustomerStats from "@/components/customers/QuickCustomerStats";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { DiarySaveButton } from "@/components/diary/SaveButton";

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
  id?: string;
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

const DraftAttachments = React.memo(function DraftAttachments({
  value,
  onChange,
}: {
  value: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      onChange([...value, ...Array.from(list)]);
      if (inputRef.current) inputRef.current.value = "";
    },
    [value, onChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      inputRef.current?.click();
    }
  }, []);

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
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 sm:p-8",
          "border-emerald-300/60 bg-emerald-50/40",
          dragActive && "bg-emerald-50 ring-2 ring-emerald-300"
        )}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Upload className="h-8 w-8" />
          <p className="text-sm">Select files to upload</p>
          <p className="text-xs">Images / PDF — or drop here</p>
        </div>
      </div>
    </>
  );
});

const DraftPreviewGrid = React.memo(function DraftPreviewGrid({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  // create object URLs for image previews
  const [urls, setUrls] = useState<string[]>([]);
  const [hovering, setHovering] = useState<number | null>(null);

  const handleRemove = useCallback(
    (index: number) => {
      onRemove(index);
    },
    [onRemove]
  );

  const setHoveringIndex = useCallback((index: number | null) => {
    setHovering(index);
  }, []);

  useEffect(() => {
    if (!files.length) {
      setUrls([]);
      return;
    }

    const next = files
      .map((f) => {
        try {
          return URL.createObjectURL(f);
        } catch {
          console.warn("Failed to create object URL for file:", f.name);
          return "";
        }
      })
      .filter((url) => url !== "");

    setUrls(next);

    return () => {
      next.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // Ignore errors when revoking URLs
        }
      });
    };
  }, [files]);

  if (!files.length) return null;

  // Don't render until we have URLs for all files
  if (urls.length !== files.length) {
    return (
      <div className="mt-3 p-4 text-center text-muted-foreground">
        <div className="animate-pulse">Loading previews...</div>
      </div>
    );
  }

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
            onMouseEnter={() => setHoveringIndex(i)}
            onMouseLeave={() => setHoveringIndex(null)}
            onClick={() => handleRemove(i)}
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
          {f.type.startsWith("image/") && urls[i] ? (
            <Image
              src={urls[i]}
              alt={f.name}
              width={160}
              height={160}
              className="h-40 w-full object-cover"
            />
          ) : f.type.startsWith("image/") ? (
            <div className="h-40 w-full flex items-center justify-center text-muted-foreground">
              <div className="animate-pulse">Loading...</div>
            </div>
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
});

export default function NewDiaryForm() {
  // core state (API contract preserved)
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    accountNo: "",
    preferredContact: "",
  });

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [what, setWhat] = useState("");
  const [priority, setPriority] = useState<
    "Low" | "Normal" | "High" | "Urgent"
  >("Normal");

  // meta
  const [tags, setTags] = useState("");
  const [storeLocation, setStoreLocation] = useState("none");
  const [dueDate, setDueDate] = useState<Date | undefined>();

  // order
  const [order, setOrder] = useState({
    supplier: "",
    orderNo: "",
    orderNotes: "",
  });
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
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{
    customer?: string;
    what?: string;
    details?: string;
    flags?: string;
  }>({});

  // Optimized handlers with useCallback
  const updateCustomer = useCallback((field: keyof Customer, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCustomerSelect = useCallback((customer: any) => {
    if (customer) {
      setSelectedCustomer(customer);
      setCustomer({
        id: customer.id,
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        accountNo: customer.accountNo || "",
        preferredContact: "",
      });
    } else {
      setSelectedCustomer(null);
      setCustomer({
        name: "",
        email: "",
        phone: "",
        accountNo: "",
        preferredContact: "",
      });
    }
  }, []);

  const updateFlags = useCallback((field: keyof FlagsState, value: any) => {
    setFlags((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleProductsChange = useCallback((newProducts: any[]) => {
    setProducts(newProducts);
  }, []);

  const handleAdminNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setAdminNotes(e.target.value);
    },
    []
  );

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

  function validate(): boolean {
    const next: {
      customer?: string;
      what?: string;
      details?: string;
      flags?: string;
    } = {};
    if (!selectedCustomer && !customer.name.trim()) {
      next.customer = "Select an existing customer or enter a name.";
    }
    if (!what.trim()) {
      next.what = "Please describe the customer's enquiry.";
    }
    if (!dueDate || storeLocation === "none") {
      next.details = "Add a due date and select a store location.";
    }
    if (flags.isPaid && (!flags.paymentMethod || !flags.amountPaid)) {
      next.flags =
        "When Paid is on, select a payment method and enter amount paid.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) {
      toast({
        title: "Missing information",
        description: "Please fix the highlighted fields and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const payload = {
      customerId: selectedCustomer?.id,
      customerInline: selectedCustomer
        ? undefined
        : customer.name
        ? customer
        : undefined,
      whatTheyWant: what,
      priority,
      tags,
      storeLocation: storeLocation === "none" ? "" : storeLocation,
      dueDate: sendDate(dueDate),

      isPaid: flags.isPaid,
      isOrdered: flags.isOrdered,
      hasTextedCustomer: flags.hasTextedCustomer,
      paymentMethod: flags.paymentMethod,
      amountPaid: flags.amountPaid,
      invoicePO: flags.invoiceOrPO,

      supplier: order.supplier,
      orderNo: order.orderNo,
      etaDate: sendDate(etaDate),
      orderStatus: "pending",
      orderNotes: order.orderNotes,

      products,
      adminNotes,
      total: total.toFixed(2),
    };

    try {
      const res = await fetch("/api/diaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = "";
        try {
          const j = await res.json();
          message = j?.message || JSON.stringify(j);
        } catch {
          message = await res.text();
        }
        throw new Error(
          message || `Server error ${res.status}. Please try again.`
        );
      }

      const d = await res.json();

      // Upload any draft files now that we have a diary id
      let failedUploads = 0;
      for (const file of draftFiles) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const up = await fetch(`/api/diaries/${d.id}/attachments`, {
            method: "POST",
            body: fd,
          });
          if (!up.ok) failedUploads++;
        } catch {
          failedUploads++;
        }
      }

      if (failedUploads > 0) {
        toast({
          title: "Some files failed to upload",
          description: `${failedUploads} attachment(s) could not be uploaded. You can add them later from the diary page.`,
        });
      }

      toast({ title: "Diary created", description: "Redirecting…" });
      window.location.href = `/diaries/${d.id}`;
    } catch (err: any) {
      console.error("Create failed:", err);
      toast({
        title: "Failed to create diary",
        description: err?.message || "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // ------- UI helpers -------
  // const PriorityChip = ({
  //   value,
  // }: {
  //   value: "Low" | "Normal" | "High" | "Urgent";
  // }) => (
  //   <Badge
  //     variant="secondary"
  //     className={cn(
  //       "h-9 px-3 rounded-full text-sm font-medium border transition-colors",
  //       value === "Low" && "bg-emerald-50 text-emerald-700 border-emerald-200",
  //       value === "Normal" && "bg-slate-50 text-slate-700 border-slate-200",
  //       value === "High" && "bg-amber-50 text-amber-700 border-amber-200",
  //       value === "Urgent" && "bg-red-50 text-red-700 border-red-200"
  //     )}
  //   >
  //     {value}
  //   </Badge>
  // );

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
          <Button
            variant="outline"
            className="justify-start font-normal h-9 px-3 rounded-full border transition-colors"
          >
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
      className="w-full pb-28"
    >
      <div className="grid gap-6">
        {/* Customer */}
        <motion.section variants={section} custom={1}>
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Customer
              </CardTitle>
              <CardDescription>
                Search for an existing customer or create a new one for this
                diary entry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.customer && (
                <div className="text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
                  <Info className="h-4 w-4 text-red-600" />
                  <span>{errors.customer}</span>
                </div>
              )}
              {/* Customer Search */}
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Find Customer
                </Label>
                <CustomerSearch
                  onSelect={handleCustomerSelect}
                  selectedCustomer={selectedCustomer}
                  placeholder="Search by name, email, phone, or account #..."
                />
              </div>

              {/* Show customer stats when selected */}
              {selectedCustomer && (
                <QuickCustomerStats customer={selectedCustomer} />
              )}

              {/* Manual Customer Entry (only if no customer selected) */}
              {!selectedCustomer && (
                <>
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold pb-2">Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={customer.name}
                        onChange={(e) => updateCustomer("name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold pb-2">
                        Email
                      </Label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={customer.email}
                        onChange={(e) =>
                          updateCustomer("email", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold pb-2">
                        Phone
                      </Label>
                      <Input
                        value={customer.phone}
                        placeholder="021......."
                        onChange={(e) =>
                          updateCustomer("phone", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold pb-2">
                        Account #
                      </Label>
                      <Input
                        value={customer.accountNo}
                        placeholder="A12..."
                        onChange={(e) =>
                          updateCustomer("accountNo", e.target.value)
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
                  </div>
                </>
              )}
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
              {errors.details && (
                <div className="lg:col-span-2 text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
                  <Info className="h-4 w-4 text-red-600" />
                  <span>{errors.details}</span>
                </div>
              )}
              <DateField
                label="Due date"
                value={dueDate}
                onChange={setDueDate}
              />
              <div>
                <Label className="text-sm font-semibold pb-2">
                  Store location
                </Label>
                <Select value={storeLocation} onValueChange={setStoreLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No store selected</SelectItem>
                    {/* Auckland Region */}
                    <SelectItem value="Albany">Albany</SelectItem>
                    <SelectItem value="Gulf Harbour">Gulf Harbour</SelectItem>
                    <SelectItem value="Half Moon Bay">Half Moon Bay</SelectItem>
                    <SelectItem value="Manukau">Manukau</SelectItem>
                    <SelectItem value="Mt Wellington">Mt Wellington</SelectItem>
                    <SelectItem value="Westgate">Westgate</SelectItem>
                    <SelectItem value="Westhaven">Westhaven</SelectItem>
                    {/* Upper North Island */}
                    <SelectItem value="Hamilton">Hamilton</SelectItem>
                    <SelectItem value="Mt Maunganui">Mt Maunganui</SelectItem>
                    <SelectItem value="Tauranga">Tauranga</SelectItem>
                    <SelectItem value="Whangārei">Whangārei</SelectItem>
                    <SelectItem value="Opua">Opua</SelectItem>
                    <SelectItem value="Napier">Napier</SelectItem>
                    {/* Lower North Island */}
                    <SelectItem value="Kapiti">Kapiti</SelectItem>
                    <SelectItem value="Seaview">Seaview</SelectItem>
                    {/* South Island */}
                    <SelectItem value="Nelson">Nelson</SelectItem>
                    <SelectItem value="Waikawa">Waikawa</SelectItem>
                    <SelectItem value="Northwood">Northwood</SelectItem>
                    <SelectItem value="Riccarton">Riccarton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-2">
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
                {errors.what && (
                  <div className="mt-2 text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
                    <Info className="h-4 w-4 text-red-600" />
                    <span>{errors.what}</span>
                  </div>
                )}
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
              {errors.flags && (
                <div className="lg:col-span-3 text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
                  <Info className="h-4 w-4 text-red-600" />
                  <span>{errors.flags}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPaid"
                  checked={flags.isPaid}
                  onCheckedChange={(checked) => updateFlags("isPaid", checked)}
                />
                <Label htmlFor="isPaid">Paid</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isOrdered"
                  checked={flags.isOrdered}
                  onCheckedChange={(checked) =>
                    updateFlags("isOrdered", checked)
                  }
                />
                <Label htmlFor="isOrdered">Ordered</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasTextedCustomer"
                  checked={flags.hasTextedCustomer}
                  onCheckedChange={(checked) =>
                    updateFlags("hasTextedCustomer", checked)
                  }
                />
                <Label htmlFor="hasTextedCustomer">Texted Customer</Label>
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
              <div className="lg:col-span-3">
                <Label className="text-sm font-semibold pb-2">
                  Order Notes
                </Label>
                <Textarea
                  placeholder="Additional order details, tracking info, etc."
                  value={order.orderNotes}
                  onChange={(e) =>
                    setOrder({ ...order, orderNotes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Products */}
        <motion.section variants={section} custom={6}>
          <ProductEditor value={products} onChange={handleProductsChange} />
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
                onChange={handleAdminNotesChange}
              />
            </CardContent>
          </Card>
        </motion.section>
      </div>

      <div className="flex mt-6">
        <DiarySaveButton
          onClick={submit}
          label="Create diary entry"
          className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg"
          isSaving={isSaving}
          disabled={isSaving}
        />
      </div>

      {/* Sticky action (mobile) */}
      <div className="md:hidden fixed inset-x-0 bottom-0 bg-white/90 backdrop-blur border-t p-3 flex items-center gap-2 z-50">
        <div className="text-sm text-muted-foreground flex-1">
          Total ~ ${total.toFixed(2)}
        </div>
        <DiarySaveButton
          onClick={submit}
          label="Create Diary"
          className="w-36"
          isSaving={isSaving}
          disabled={isSaving}
        />
      </div>
    </motion.div>
  );
}
