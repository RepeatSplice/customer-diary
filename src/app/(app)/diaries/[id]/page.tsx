import DiaryDetail from "@/components/diary/DiaryDetail";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DiaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>; // 👈 params is a Promise
}) {
  const { id } = await params; // 👈 await it

  try {
    await requireSession();
  } catch {
    redirect("/sign-in");
  }

  return <DiaryDetail id={id} />;
}
