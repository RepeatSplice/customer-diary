"use client";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  // Derived busy state from mutations
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const remaining = Math.max(0, 3 - files.length);
  const canAddMore = remaining > 0;

  const draftKey = useMemo(
    () => ["diary-attachments-draft", diaryId] as const,
    [diaryId]
  );
  const initializedFromDraft = useRef(false);

  // Initialize from persisted draft once (survive tab switches until server confirms)
  useEffect(() => {
    if (initializedFromDraft.current) return;
    const draft = queryClient.getQueryData<Attachment[]>(draftKey);
    if (draft && Array.isArray(draft) && draft.length) {
      setFiles(draft);
    }
    initializedFromDraft.current = true;
  }, [draftKey, queryClient]);

  // Merge local files with parent props (avoid losing freshly uploaded items)
  useEffect(() => {
    setFiles((prev) => {
      const order = [...prev, ...initial];
      const seen = new Set<string>();
      const merged: Attachment[] = [];
      for (const a of order) {
        if (!a || !a.id) continue;
        if (!seen.has(a.id)) {
          seen.add(a.id);
          merged.push(a);
        }
      }
      return merged.slice(0, 3);
    });
  }, [initial]);

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

  const uploadMutation = useMutation({
    mutationKey: ["attachments-upload", diaryId],
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/diaries/${diaryId}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as Attachment;
    },
    onSuccess: (row: Attachment) => {
      setFiles((prev) => {
        const next = [row, ...prev].slice(0, 3);
        return next;
      });
      // Optimistically update cached diary attachments so other tabs/parent reflect immediately
      queryClient.setQueryData(["diary", diaryId], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const current = old as { attachments?: Attachment[] } & Record<
          string,
          unknown
        >;
        const nextList = [row, ...(current.attachments || [])];
        const dedup = nextList.filter(
          (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i
        );
        return { ...current, attachments: dedup.slice(0, 3) };
      });
      // Persist draft so newly added files remain visible across tab switches
      queryClient.setQueryData(
        ["diary-attachments-draft", diaryId],
        (prev: unknown) => {
          const current = Array.isArray(prev) ? (prev as Attachment[]) : [];
          const next = [row as Attachment, ...current];
          const dedup = next.filter(
            (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i
          );
          return dedup.slice(0, 3);
        }
      );
    },
  });

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0 || !canAddMore) return;
    try {
      const toUpload = Array.from(list).slice(0, remaining);
      for (const f of toUpload) {
        // accept only images/pdf
        if (!/^image\/|^application\/pdf$/.test(f.type)) continue;
        const row = await uploadMutation.mutateAsync(f);
        // Update draft after each successful upload to survive tab switch before invalidate completes
        queryClient.setQueryData(
          ["diary-attachments-draft", diaryId],
          (prev: unknown) => {
            const current = Array.isArray(prev) ? (prev as Attachment[]) : [];
            const next = [row as Attachment, ...current];
            const dedup = next.filter(
              (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i
            );
            return dedup.slice(0, 3);
          }
        );
      }
      toast({ title: "Upload complete" });
      // Invalidate diary so persisted cache and other tabs refresh
      queryClient.invalidateQueries({ queryKey: ["diary", diaryId] });
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
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

  const removeMutation = useMutation({
    mutationKey: ["attachments-remove", diaryId],
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/api/diaries/${diaryId}/attachments?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text());
      return id;
    },
    onSuccess: (id: string) => {
      setFiles((prev) => {
        const filtered = prev.filter((x) => x.id !== id);
        queryClient.setQueryData(draftKey, filtered);
        return filtered;
      });
      setImageUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[id];
        return newUrls;
      });
      toast({ title: "Attachment removed" });
      queryClient.setQueryData(["diary", diaryId], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const current = old as { attachments?: Attachment[] } & Record<
          string,
          unknown
        >;
        const filtered = (current.attachments || []).filter((x) => x.id !== id);
        return { ...current, attachments: filtered };
      });
      queryClient.invalidateQueries({ queryKey: ["diary", diaryId] });
    },
    onError: () => {
      toast({ title: "Failed to remove", variant: "destructive" });
    },
  });

  async function remove(id: string) {
    await removeMutation.mutateAsync(id);
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
        disabled={
          !canAddMore || uploadMutation.isPending || removeMutation.isPending
        }
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() =>
          canAddMore && !uploadMutation.isPending && inputRef.current?.click()
        }
        onKeyDown={(e) => {
          if (
            (e.key === "Enter" || e.key === " ") &&
            canAddMore &&
            !uploadMutation.isPending &&
            !removeMutation.isPending
          ) {
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 sm:p-8 cursor-pointer transition-all duration-200 ",
          "border-emerald-300/60 bg-emerald-50/40 hover:bg-emerald-50/60",
          canAddMore &&
            !uploadMutation.isPending &&
            !removeMutation.isPending &&
            "hover:cursor-copy",
          dragActive &&
            (canAddMore &&
            !uploadMutation.isPending &&
            !removeMutation.isPending
              ? "bg-emerald-100 ring-2 ring-emerald-400 scale-105 cursor-copy"
              : "bg-emerald-100 ring-2 ring-emerald-400 scale-105"),
          (!canAddMore ||
            uploadMutation.isPending ||
            removeMutation.isPending) &&
            "opacity-60 cursor-not-allowed"
        )}
        aria-disabled={
          !canAddMore || uploadMutation.isPending || removeMutation.isPending
        }
      >
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <UploadCloud
            className={cn("h-8 w-8", dragActive && "text-emerald-600")}
          />
          <p className="text-sm font-medium">
            {canAddMore
              ? uploadMutation.isPending || removeMutation.isPending
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
