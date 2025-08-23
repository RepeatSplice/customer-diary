"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Plus, Trash } from "lucide-react";

export function ProductEditor({
  value,
  onChange,
}: {
  value: any[];
  onChange: (v: any[]) => void;
}) {
  const [rows, setRows] = useState<any[]>(value || []);
  function add() {
    const v = [...rows, { upc: "", name: "", qty: 1, unitPrice: 0 }];
    setRows(v);
    onChange(v);
  }
  function remove(i: number) {
    const v = rows.filter((_, idx) => idx !== i);
    setRows(v);
    onChange(v);
  }
  function set(i: number, key: string, val: any) {
    const v = rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r));
    setRows(v);
    onChange(v);
  }

  const subtotal = rows.reduce(
    (s, r) => s + Number(r.qty || 0) * Number(r.unitPrice || 0),
    0
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Products</CardTitle>
        <Button variant="secondary" onClick={add} className="gap-2">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[120px_1fr_100px_140px_40px] gap-2 items-end"
          >
            <div>
              <Label className="text-sm font-semibold pb-2">UPC</Label>
              <Input
                value={r.upc}
                onChange={(e) => set(i, "upc", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold pb-2">Product</Label>
              <Input
                value={r.name}
                onChange={(e) => set(i, "name", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold pb-2">Qty</Label>
              <Input
                type="number"
                value={r.qty}
                onChange={(e) => set(i, "qty", Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold pb-2">Unit Price</Label>
              <Input
                type="number"
                value={r.unitPrice}
                onChange={(e) => set(i, "unitPrice", Number(e.target.value))}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(i)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="text-right text-sm text-muted-foreground">
          Subtotal (client): ${subtotal.toFixed(2)} — Final calc in DB
        </div>
      </CardContent>
    </Card>
  );
}
