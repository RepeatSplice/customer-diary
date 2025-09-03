"use client";
import { Followups } from "@/components/diary/Followups";

type Follow = {
  id: string;
  entryType: "note" | "call" | "sms" | "email";
  message: string;
  staffCode?: string | null;
  createdAt: string;
};

interface FollowupsTabProps {
  diaryId: string;
  followups: Follow[];
}

export function FollowupsTab({ diaryId, followups }: FollowupsTabProps) {
  return (
    <div className="space-y-4">
      <Followups diaryId={diaryId} initial={followups} />
    </div>
  );
}
