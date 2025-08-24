"use client";
import { useRef, useState, useCallback } from "react";
import {
  UploadCloud,
  ExternalLink,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import React from "react";

type Attachment = {
  id: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  filePath?: string | null;
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
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = Math.max(0, 3 - files.length);
  const canAddMore = remaining > 0;

  // Load image URLs for previews
  const loadImageUrl = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/attachments/${id}/url`);
      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          setImageUrls((prev) => ({ ...prev, [id]: url }));
        }
      } else {
        console.warn(`Failed to load image URL for ${id}:`, res.status);
      }
    } catch (error) {
      console.error("Failed to load image URL:", error);
      // Don't show error toast for image previews - just log it
    }
  }, []);

  // Load URLs for all image attachments
  const loadImageUrls = useCallback(() => {
    files.forEach((file) => {
      if (isImage(file.mimeType) && !imageUrls[file.id]) {
        loadImageUrl(file.id);
      }
    });
  }, [files, imageUrls, loadImageUrl]);

  // Load URLs when files change
  React.useEffect(() => {
    loadImageUrls();
  }, [loadImageUrls]);

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
    try {
      const res = await fetch(`/api/attachments/${id}/url`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      const { url } = await res.json();
      if (url) {
        window.open(url, "_blank");
      } else {
        toast({ title: "No URL available", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error opening attachment:", error);
      toast({
        title: "Failed to open file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
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
      // Remove from image URLs
      setImageUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[id];
        return newUrls;
      });
      toast({ title: "Attachment removed" });
    } else {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  }

  const getFileIcon = (mimeType: string | null | undefined) => {
    if (mimeType?.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const isImage = (mimeType: string | null | undefined) =>
    mimeType?.startsWith("image/") || false;

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
          "rounded-2xl border-2 border-dashed p-6 sm:p-8 cursor-pointer transition-all duration-200",
          "border-emerald-300/60 bg-emerald-50/40 hover:bg-emerald-50/60",
          dragActive && "bg-emerald-100 ring-2 ring-emerald-400 scale-105",
          (!canAddMore || busy) && "opacity-60 cursor-not-allowed"
        )}
        aria-disabled={!canAddMore || busy}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <UploadCloud
            className={cn("h-8 w-8", dragActive && "text-emerald-600")}
          />
          <p className="text-sm font-medium">
            {canAddMore
              ? busy
                ? "Uploading…"
                : "Select files to upload or drag & drop here"
              : "Max 3 files reached"}
          </p>
          <p className="text-xs">Images / PDF — up to 3 files</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((f) => (
            <div
              key={f.id}
              className="relative group border rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Remove button - positioned to stay within the card bounds */}
              <button
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
                aria-label="Remove file"
                onClick={() => remove(f.id)}
              >
                <X className="h-4 w-4" />
              </button>

              {/* File preview/content */}
              <div className="p-4">
                {isImage(f.mimeType) ? (
                  <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100">
                    {imageUrls[f.id] ? (
                      <Image
                        src={imageUrls[f.id]}
                        alt={f.fileName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        onError={() => {
                          // Remove failed URL and try to reload
                          setImageUrls((prev) => {
                            const newUrls = { ...prev };
                            delete newUrls[f.id];
                            return newUrls;
                          });
                          // Don't retry immediately to avoid infinite loops
                          setTimeout(() => loadImageUrl(f.id), 2000);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-pulse">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-32 mb-3 rounded-lg bg-gray-100 flex items-center justify-center">
                    {getFileIcon(f.mimeType)}
                  </div>
                )}

                {/* File info */}
                <div className="space-y-2">
                  <div
                    className="font-medium text-sm truncate"
                    title={f.fileName}
                  >
                    {f.fileName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {f.mimeType ?? "file"}{" "}
                    {typeof f.sizeBytes === "number" && f.sizeBytes >= 0
                      ? `• ${Math.round(Number(f.sizeBytes) / 1024)} KB`
                      : ""}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => open(f.id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
