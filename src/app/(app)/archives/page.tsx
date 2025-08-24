import ArchivesList from "@/components/archives/ArchivesList";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ArchivesPage() {
  // Ensure user is authenticated before accessing archives
  try {
    await requireSession();
  } catch {
    // Redirect to sign-in if not authenticated
    redirect("/sign-in");
  }

  return <ArchivesList />;
}
