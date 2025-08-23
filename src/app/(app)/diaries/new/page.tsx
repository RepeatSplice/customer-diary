import NewDiaryForm from "@/components/forms/NewDiaryForm";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewDiaryPage() {
  // Ensure user is authenticated before creating new diary
  try {
    await requireSession();
  } catch {
    // Redirect to sign-in if not authenticated
    redirect("/sign-in");
  }

  return <NewDiaryForm />;
}
