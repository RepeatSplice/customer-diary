"use client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type OverdueItem = {
  id: string;
  customer?: { name?: string | null };
  whatTheyWant?: string;
};
export function OverdueModal() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OverdueItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/diaries?overdue=1&limit=20");
        if (!res.ok) return;
        const data = (await res.json()) as OverdueItem[];
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
          setOpen(true);
        }
      } catch {}
    })();
  }, []);

  if (!items.length) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Needs Attention (not opened in 3+ days)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[50vh] overflow-auto">
          {items.map((d) => (
            <div
              key={d.id}
              className="p-3 border rounded-lg bg-white flex items-center justify-between"
            >
              <div>
                <div className="font-medium">
                  {d.customer?.name || "Customer"}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {d.whatTheyWant}
                </div>
              </div>
              <Link href={`/diaries/${d.id}`}>
                <Button size="sm">Open</Button>
              </Link>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
