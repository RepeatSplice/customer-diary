// src/app/exports/page.tsx
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export default async function ExportPage() {
  const session = await requireSession().catch(() => null);

  if (!session) {
    redirect("/sign-in");
  }

  if (session.user.role !== "manager") {
    // Not a manager: send them away (or render a message instead)
    redirect("/dashboard");
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Export</h1>
      <p className="text-sm text-muted-foreground">
        Managers can export a CSV of non-archived diaries.
      </p>
      <Button asChild>
        <a href="/api/export/csv" download="customer-diaries.csv">
          Download CSV
        </a>
      </Button>
    </div>
  );
}
