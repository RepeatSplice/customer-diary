"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Mail, Phone, Hash, User } from "lucide-react";

export const STATUS_LABELS: Record<string, string> = {
  Pending: "Pending",
  Ordered: "Ordered",
  Ready: "Ready",
  Waiting: "Waiting Reply",
  Collected: "Collected",
  Cancelled: "Cancelled",
};

export const STATUS_VALUES = Object.keys(STATUS_LABELS) as Array<
  keyof typeof STATUS_LABELS
>;
export const PRIORITIES = ["Low", "Normal", "High", "Urgent"] as const;

export type Patchable = {
  status?: string;
  priority?: string;
  isPaid?: boolean;
  isOrdered?: boolean;
  hasTextedCustomer?: boolean;
  whatTheyWant?: string;
  adminNotes?: string;
  dueDate?: string | null;
  paymentMethod?: string;
  amountPaid?: string;
  invoicePO?: string;
  paidAt?: string | null;
  storeLocation?: string;
  tags?: string;
  total?: string;
  assignedTo?: string | null;
  supplier?: string;
  orderNo?: string;
  etaDate?: string | null;
  orderStatus?: string;
  orderNotes?: string;
};

export type CustomerInfo = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  accountNo?: string | null;
} | null;

export function CustomerCard({ customer }: { customer: CustomerInfo }) {
  if (!customer) return null;
  return (
    <Card className="rounded-2xl border-rounded shadow-lg bg-white">
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
        <CardDescription>
          Customer contact details and account information.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold pb-2 flex items-center gap-2">
            <User className="h-4 w-4" /> Name
          </Label>
          <Input value={customer.name || ""} disabled />
        </div>
        <div>
          <Label className="text-sm font-semibold pb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email
          </Label>
          <Input value={customer.email || ""} disabled />
        </div>
        <div>
          <Label className="text-sm font-semibold pb-2 flex items-center gap-2">
            <Phone className="h-4 w-4" /> Phone
          </Label>
          <Input value={customer.phone || ""} disabled />
        </div>
        <div>
          <Label className="text-sm font-semibold pb-2 flex items-center gap-2">
            <Hash className="h-4 w-4" /> Account Code
          </Label>
          <Input value={customer.accountNo || ""} disabled />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusFlagsCard({
  form,
  set,
  createdAt,
  updatedAt,
  isLoadingStaff,
  staffOptions,
  onStatusChange,
}: {
  form: Patchable;
  set: <K extends keyof Patchable>(key: K, value: Patchable[K]) => void;
  createdAt: string;
  updatedAt?: string | null;
  isLoadingStaff: boolean;
  staffOptions: Array<{ id: string; label: string }>;
  onStatusChange?: (next: string) => void;
}) {
  return (
    <Card className="rounded-2xl border-rounded shadow-lg bg-white">
      <CardHeader>
        <CardTitle>Status & Flags</CardTitle>
        <CardDescription>
          Set the status and priority of the customer diary.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-semibold pb-2">Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              onStatusChange ? onStatusChange(v) : set("status", v)
            }
          >
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

        <div>
          <Label className="text-sm font-semibold pb-2">Date received</Label>
          <Input value={new Date(createdAt).toLocaleString()} disabled />
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
            value={updatedAt ? new Date(updatedAt).toLocaleDateString() : ""}
            disabled
          />
        </div>

        <div>
          <Label className="text-sm font-semibold pb-2">Store location</Label>
          <Select
            value={form.storeLocation || "none"}
            onValueChange={(value) =>
              set("storeLocation", value === "none" ? "" : value)
            }
          >
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
        <div>
          <Label className="text-sm font-semibold pb-2">Assigned to</Label>
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
                  isLoadingStaff ? "Loading staff..." : "Select staff member"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No staff assigned</SelectItem>
              {staffOptions.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.label}
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
  );
}

export function RequestNotesCard({
  form,
  set,
}: {
  form: Patchable;
  set: <K extends keyof Patchable>(key: K, value: Patchable[K]) => void;
}) {
  return (
    <Card className="rounded-2xl border-rounded shadow-lg bg-white">
      <CardHeader>
        <CardTitle>Request & Notes</CardTitle>
        <CardDescription>
          Add any additional notes or requests from the customer.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold pb-2">Customer Enquiry</Label>
          <Textarea
            rows={4}
            value={form.whatTheyWant || ""}
            onChange={(e) => set("whatTheyWant", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold pb-2">Admin notes</Label>
          <Textarea
            rows={4}
            value={form.adminNotes || ""}
            onChange={(e) => set("adminNotes", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentCard({
  form,
  set,
  subtotal,
  total,
}: {
  form: Patchable;
  set: <K extends keyof Patchable>(key: K, value: Patchable[K]) => void;
  subtotal: number | string | null | undefined;
  total: string | number | null | undefined;
}) {
  const balance = (() => {
    const tot = Number(form?.total || total || 0);
    const paid = Number(form?.amountPaid || "0");
    const bal = tot - paid;
    return bal >= 0 ? bal.toFixed(2) : "0.00";
  })();

  return (
    <Card className="rounded-2xl border-rounded shadow-lg bg-white">
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>
          Add the payment details for the customer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-semibold pb-2">Payment method</Label>
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
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <Label className="text-sm font-semibold pb-2">Amount paid</Label>
            <Input
              type="number"
              placeholder="0.00"
              inputMode="decimal"
              value={form.amountPaid}
              onChange={(e) => set("amountPaid", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm font-semibold pb-2">Invoice / PO</Label>
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
            <Label className="text-sm font-semibold pb-2">Total amount</Label>
            <Input
              type="number"
              placeholder="0.00"
              inputMode="decimal"
              value={form.total}
              onChange={(e) => set("total", e.target.value)}
            />
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          Subtotal: ${Number(subtotal || 0).toFixed(2)} • Total: $
          {Number(total || 0).toFixed(2)} •
          <span
            className={cn(
              "font-medium",
              Number(balance) > 0 ? "text-red-600" : "text-green-600"
            )}
          >
            {" "}
            Balance: ${balance}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
