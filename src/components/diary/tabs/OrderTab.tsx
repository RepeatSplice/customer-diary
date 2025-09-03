"use client";
import { OrderCard } from "@/components/diary/detail/OrderSection";
import type { Patchable } from "@/hooks/useDiaryDetail";

interface OrderTabProps {
  formData: Patchable;
  updateField: <K extends keyof Patchable>(key: K, value: Patchable[K]) => void;
}

export function OrderTab({ formData, updateField }: OrderTabProps) {
  return (
    <div className="space-y-4">
      <OrderCard form={formData} set={updateField} />
    </div>
  );
}
