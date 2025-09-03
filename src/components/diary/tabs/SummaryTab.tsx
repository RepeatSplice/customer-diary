"use client";
import { useState } from "react";
import {
  CustomerCard,
  StatusFlagsCard,
  RequestNotesCard,
  PaymentCard,
} from "@/components/diary/detail/SummarySection";
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
import { ShieldAlert } from "lucide-react";
import type { DiaryData, Patchable } from "@/hooks/useDiaryDetail";
import { useStaff } from "@/hooks/useStaff";

interface SummaryTabProps {
  diary: DiaryData;
  formData: Patchable;
  updateField: <K extends keyof Patchable>(key: K, value: Patchable[K]) => void;
}

export function SummaryTab({ diary, formData, updateField }: SummaryTabProps) {
  const { staffOptions, isLoading: isLoadingStaff } = useStaff();
  const [needManagerOverride, setNeedManagerOverride] = useState<{
    nextStatus: string;
  } | null>(null);

  // Totals are calculated inside PaymentCard; duplicate calc removed

  const handleStatusChange = (nextStatus: string) => {
    // Manager override if marking Collected while not paid
    if (nextStatus === "Collected" && !formData.isPaid) {
      setNeedManagerOverride({ nextStatus });
      return;
    }
    updateField("status", nextStatus);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Customer Information */}
        <CustomerCard customer={diary.customer} />

        {/* Status & Flags */}
        <StatusFlagsCard
          form={formData}
          set={updateField}
          createdAt={diary.createdAt}
          updatedAt={diary.updatedAt}
          isLoadingStaff={isLoadingStaff}
          staffOptions={staffOptions}
          onStatusChange={handleStatusChange}
        />

        {/* Request & Notes */}
        <RequestNotesCard form={formData} set={updateField} />

        {/* Payment */}
        <PaymentCard
          form={formData}
          set={updateField}
          subtotal={diary.subtotal}
          total={diary.total}
        />
      </div>

      {/* Manager override dialog */}
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
                if (needManagerOverride) {
                  updateField("status", needManagerOverride.nextStatus);
                }
                setNeedManagerOverride(null);
              }}
            >
              Override & continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
