import { Badge } from "@/components/ui/badge";

type Status =
  | "Pending"
  | "Ordered"
  | "ReadyForPickup"
  | "Collected"
  | "Cancelled";
export function StatusBadge({ status }: { status: string }) {
  const map: Record<Status, string> = {
    Pending: "bg-gray-200 text-gray-900",
    Ordered: "bg-blue-200 text-blue-900",
    ReadyForPickup: "bg-amber-200 text-amber-900",
    Collected: "bg-green-200 text-green-900",
    Cancelled: "bg-red-200 text-red-900",
  };
  const cls = map[status as Status] ?? "bg-gray-200 text-gray-900";
  return (
    <Badge className={`h-9 px-3 text-sm rounded-full border ${cls}`}>
      {status}
    </Badge>
  );
}
