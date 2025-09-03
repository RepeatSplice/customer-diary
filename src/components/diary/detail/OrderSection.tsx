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
import { Textarea } from "@/components/ui/textarea";
import type { Patchable } from "./SummarySection";

export function OrderCard({
  form,
  set,
}: {
  form: Patchable;
  set: <K extends keyof Patchable>(key: K, value: Patchable[K]) => void;
}) {
  return (
    <Card className="rounded-2xl border-rounded shadow-lg bg-white">
      <CardHeader>
        <CardTitle>Order Information</CardTitle>
        <CardDescription>
          Supplier details, order numbers, and delivery information.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold pb-2">Supplier</Label>
          <Input
            value={form?.supplier || ""}
            onChange={(e) => set("supplier", e.target.value)}
            placeholder="e.g. Black Magic Tackle"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold pb-2">Order Number</Label>
          <Input
            value={form?.orderNo || ""}
            onChange={(e) => set("orderNo", e.target.value)}
            placeholder="e.g. ORD-2024-001"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold pb-2">ETA Date</Label>
          <Input
            type="date"
            value={form?.etaDate ?? ""}
            onChange={(e) => set("etaDate", e.target.value || null)}
          />
        </div>
        <div>
          <Label className="text-sm font-semibold pb-2">Order Status</Label>
          <Select
            value={form?.orderStatus || "pending"}
            onValueChange={(value) => set("orderStatus", value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold pb-2">Order Notes</Label>
          <Textarea
            rows={3}
            value={form?.orderNotes || ""}
            onChange={(e) => set("orderNotes", e.target.value)}
            placeholder="Additional order details, tracking info, etc."
          />
        </div>
      </CardContent>
    </Card>
  );
}
