"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DiarySaveButton } from "@/components/diary/SaveButton";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, Tag, Archive, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";

export function HeaderBar({
  id,
  customerName,
  customerEmail,
  customerPhone,
  customerAccountNo,
  status,
  priority,
  onBack,
  onArchive,
  onSave,
  isArchiving = false,
  isSaving = false,
  isDirty = false,
}: {
  id: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAccountNo?: string | null;
  status?: string;
  priority?: string;
  onBack: () => void;
  onArchive: () => Promise<void> | void;
  onSave: () => void;
  isArchiving?: boolean;
  isSaving?: boolean;
  isDirty?: boolean;
}) {
  return (
    <Card className="sticky top-0 z-10 shadow-sm">
      <CardContent className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={onBack}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="text-lg font-semibold">
                Diary Detail{customerName ? ` for ${customerName}` : ""}
              </div>
              {(customerEmail || customerPhone || customerAccountNo) && (
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                  {customerEmail && <span>{customerEmail}</span>}
                  {customerPhone && <span>{customerPhone}</span>}
                  {customerAccountNo && (
                    <span>Account: {customerAccountNo}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status && <StatusBadge status={status} />}
            {priority && <PriorityBadge priority={priority} />}

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

            <Button
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={() => void onArchive()}
              disabled={isArchiving}
            >
              {isArchiving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </>
              )}
            </Button>

            {/* Save status chip */}
            {isSaving ? (
              <span className="hidden sm:inline-flex items-center h-9 rounded-full px-3 text-sm bg-amber-50 text-amber-700 border border-amber-300">
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
              </span>
            ) : isDirty ? (
              <span className="hidden sm:inline-flex items-center h-9 rounded-full px-3 text-sm bg-amber-50 text-amber-700 border border-amber-300">
                Unsaved changes
              </span>
            ) : null}

            <DiarySaveButton
              onClick={onSave}
              isSaving={isSaving}
              disabled={!isDirty}
            />
          </div>
        </div>
        <Separator className="my-2" />
      </CardContent>
    </Card>
  );
}
