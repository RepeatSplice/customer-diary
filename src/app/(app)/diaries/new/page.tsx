import NewDiaryForm from "@/components/forms/NewDiaryForm";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import RefreshButton from "@/components/RefreshButton";

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

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 max-w-[1400px] mx-auto bg-white min-h-screen">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            New Customer Diary
          </h1>
          <p className="text-gray-600 mt-1">Create a new diary entry</p>
        </div>
        <RefreshButton />
      </div>
      <NewDiaryForm />
    </div>
  );
}
