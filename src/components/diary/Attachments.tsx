"use client";
import { useRef, useState, useCallback } from "react";
import { UploadCloud, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type Attachment = {
  id: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export function Attachments({
  diaryId,
  initial,
}: {
  diaryId: string;
  initial: Attachment[];
}) {
  const [files, setFiles] = useState<Attachment[]>(initial);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = Math.max(0, 3 - files.length);
  const canAddMore = remaining > 0;

  const uploadOne = useCallback(
    async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/diaries/${diaryId}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const row: Attachment = await res.json();
      setFiles((prev) => [row, ...prev].slice(0, 3));
    },
    [diaryId]
  );

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0 || !canAddMore) return;
    setBusy(true);
    try {
      const toUpload = Array.from(list).slice(0, remaining);
      for (const f of toUpload) {
        // accept only images/pdf
        if (!/^image\/|^application\/pdf$/.test(f.type)) continue;
        await uploadOne(f);
      }
      toast({ title: "Upload complete" });
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onInputChange = async () =>
    handleFiles(inputRef.current?.files ?? null);

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    await handleFiles(e.dataTransfer?.files ?? null);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  async function open(id: string) {
    const res = await fetch(`/api/attachments/${id}/url`);
    const { url } = await res.json();
    if (url) window.open(url, "_blank");
  }

  async function remove(id: string) {
    const res = await fetch(
      `/api/diaries/${diaryId}/attachments?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );
    if (res.ok) {
      setFiles((prev) => prev.filter((x) => x.id !== id));
      toast({ title: "Attachment removed" });
    } else {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={onInputChange}
        disabled={!canAddMore || busy}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => canAddMore && !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && canAddMore && !busy) {
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 sm:p-8 cursor-pointer",
          "border-emerald-300/60 bg-emerald-50/40",
          dragActive && "bg-emerald-50 ring-2 ring-emerald-300",
          (!canAddMore || busy) && "opacity-60 cursor-not-allowed"
        )}
        aria-disabled={!canAddMore || busy}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <UploadCloud className="h-8 w-8" />
          <p className="text-sm">
            {canAddMore
              ? busy
                ? "Uploading…"
                : "Select files to upload"
              : "Max 3 files reached"}
          </p>
          <p className="text-xs">Images / PDF — or drop here</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map((f) => (
            <div
              key={f.id}
              className="relative p-3 border rounded-xl bg-white flex items-center justify-between"
            >
              {/* X remove */}
              <button
                className="absolute -top-2 -left-2 h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow hover:bg-red-700 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Remove file"
                onClick={() => remove(f.id)}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="pr-3">
                <div className="font-medium text-sm truncate max-w-[260px]">
                  {f.fileName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {f.mimeType ?? "file"}{" "}
                  {typeof f.sizeBytes === "number" && f.sizeBytes >= 0
                    ? `• ${Math.round(Number(f.sizeBytes) / 1024)} KB`
                    : ""}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={() => open(f.id)}
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
