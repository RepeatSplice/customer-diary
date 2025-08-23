import { Badge } from "@/components/ui/badge";

type Priority = "Low" | "Normal" | "High" | "Urgent";
export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<Priority, string> = {
    Low: "bg-slate-200 text-slate-900",
    Normal: "bg-neutral-200 text-neutral-900",
    High: "bg-orange-200 text-orange-900",
    Urgent: "bg-rose-200 text-rose-900",
  };
  const cls = map[priority as Priority] ?? "bg-neutral-200 text-neutral-900";
  return <Badge className={cls}>{priority}</Badge>;
}
