"use client";
import { Attachments } from "@/components/diary/Attachments";

type Attachment = {
  id: string;
  fileName: string;
  filePath?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

interface AttachmentsTabProps {
  diaryId: string;
  attachments: Attachment[];
}

export function AttachmentsTab({ diaryId, attachments }: AttachmentsTabProps) {
  return (
    <div className="space-y-4">
      <Attachments diaryId={diaryId} initial={attachments} />
    </div>
  );
}
