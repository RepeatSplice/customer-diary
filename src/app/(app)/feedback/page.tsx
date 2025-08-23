"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { toast } from "@/components/ui/use-toast";
import { ArrowUp, Pin, PinOff, MessageSquareText, Trash2 } from "lucide-react";

type Item = {
  id: string;
  title: string;
  details: string;
  kind: "feature" | "bug";
  severity: "low" | "normal" | "high";
  status: "Open" | "Planned" | "InProgress" | "Done" | "Declined";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  votes: number;
  comments: number;
  hasVoted: boolean;
  creatorName: string | null;
  creatorCode: string | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Chip({
  children,
  intent,
}: {
  children: React.ReactNode;
  intent?: "green" | "amber" | "red" | "slate";
}) {
  const cls =
    intent === "green"
      ? "bg-emerald-50 text-emerald-700"
      : intent === "amber"
      ? "bg-amber-50 text-amber-700"
      : intent === "red"
      ? "bg-red-50 text-red-700"
      : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${cls}`}
    >
      {children}
    </span>
  );
}

function StatusChip({ status }: { status: Item["status"] }) {
  const map: Record<
    Item["status"],
    { label: string; intent: "slate" | "green" | "amber" | "red" }
  > = {
    Open: { label: "Open", intent: "slate" },
    Planned: { label: "Planned", intent: "amber" },
    InProgress: { label: "In Progress", intent: "amber" },
    Done: { label: "Done", intent: "green" },
    Declined: { label: "Declined", intent: "red" },
  };
  const s = map[status];
  return <Chip intent={s.intent}>{s.label}</Chip>;
}

export default function FeedbackPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "manager";
  const myId: string | undefined = session?.user?.id;

  // Filters
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "feature" | "bug">("all");
  const [severity, setSeverity] = useState<"all" | "low" | "normal" | "high">(
    "all"
  );
  const [status, setStatusFilter] = useState<"all" | Item["status"]>("all");
  const [sort, setSort] = useState<"top" | "new">("top");

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("query", q);
    if (kind && kind !== "all") p.set("kind", kind);
    if (severity && severity !== "all") p.set("severity", severity);
    if (status && status !== "all") p.set("status", status);
    p.set("sort", sort);
    p.set("limit", "50");
    return p.toString();
  }, [q, kind, severity, status, sort]);

  const { data, mutate, isLoading } = useSWR<{ items: Item[] }>(
    `/api/feedback?${params}`,
    fetcher,
    { keepPreviousData: true }
  );

  // Composer state
  const [cKind, setCKind] = useState<"feature" | "bug">("feature");
  const [cSeverity, setCSeverity] = useState<"low" | "normal" | "high">(
    "normal"
  );
  const [cTitle, setCTitle] = useState("");
  const [cDetails, setCDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: cKind,
          severity: cSeverity,
          title: cTitle,
          details: cDetails,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Feedback created" });
      setCTitle("");
      setCDetails("");
      setCKind("feature");
      setCSeverity("normal");
      await mutate();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({
        title: "Create failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleVote(item: Item) {
    try {
      // optimistic update
      await mutate(
        async (prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            items: prev.items.map((it) => {
              if (it.id !== item.id) return it;
              const hasVoted = !it.hasVoted;
              const votes = hasVoted ? it.votes + 1 : it.votes - 1;
              return { ...it, hasVoted, votes };
            }),
          };
          return next;
        },
        { revalidate: false }
      );

      const res = await fetch(`/api/feedback/${item.id}/vote`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      const { votes } = await res.json();
      // sync
      await mutate(
        async (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((it) =>
              it.id === item.id ? { ...it, votes } : it
            ),
          };
        },
        { revalidate: false }
      );
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({
        title: "Vote failed",
        description: errorMessage,
        variant: "destructive",
      });
      mutate(); // refetch to correct
    }
  }

  async function setPinned(item: Item, pinned: boolean) {
    try {
      const res = await fetch(`/api/feedback/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      if (!res.ok) throw new Error(await res.text());
      await mutate();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  async function setStatus(item: Item, value: Item["status"]) {
    try {
      const res = await fetch(`/api/feedback/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!res.ok) throw new Error(await res.text());
      await mutate();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  async function removeItem(item: Item) {
    if (!confirm("Delete this feedback?")) return;
    try {
      const res = await fetch(`/api/feedback/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Deleted" });
      await mutate();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  // Comments per item (lazy load on expand)
  type Comment = {
    id: string;
    message: string;
    createdAt: string;
    authorId: string;
    authorName: string | null;
    authorCode: string | null;
  };
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});

  async function loadComments(itemId: string) {
    if (comments[itemId]) return;
    const res = await fetch(`/api/feedback/${itemId}/comments`);
    if (res.ok) {
      const j = await res.json();
      setComments((c) => ({ ...c, [itemId]: j.items || [] }));
    }
  }

  async function addComment(item: Item) {
    const msg = (newComment[item.id] || "").trim();
    if (!msg) return;
    try {
      const res = await fetch(`/api/feedback/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) throw new Error(await res.text());
      const row = await res.json();
      setComments((c) => ({ ...c, [item.id]: [...(c[item.id] || []), row] }));
      setNewComment((n) => ({ ...n, [item.id]: "" }));
      toast({ title: "Comment added" });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({
        title: "Failed to comment",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  // UI helpers
  const section = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  };

  return (
    <div className="px-6 py-6">
      {/* Header controls */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          placeholder="Search feedback by title or details…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 rounded-xl lg:flex-1"
        />
        <div className="flex gap-2 flex-wrap">
          <Select
            value={kind}
            onValueChange={(v: "all" | "feature" | "bug") => setKind(v)}
          >
            <SelectTrigger className="h-11 w-[150px] rounded-xl">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={severity}
            onValueChange={(v: "all" | "low" | "normal" | "high") =>
              setSeverity(v)
            }
          >
            <SelectTrigger className="h-11 w-[150px] rounded-xl">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(v: "all" | Item["status"]) => setStatusFilter(v)}
          >
            <SelectTrigger className="h-11 w-[180px] rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Planned">Planned</SelectItem>
              <SelectItem value="InProgress">In Progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
              <SelectItem value="Declined">Declined</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v: "top" | "new") => setSort(v)}>
            <SelectTrigger className="h-11 w-[150px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="new">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Composer */}
      <motion.div initial="hidden" animate="show" variants={section}>
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Create Feedback</CardTitle>
            <CardDescription>
              Suggest a feature or report a bug.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid gap-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="justify-left">
                  <Label className="text-sm font-semibold pb-2">Type</Label>
                  <Select
                    value={cKind}
                    onValueChange={(v: "feature" | "bug") => setCKind(v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold pb-2">Severity</Label>
                  <Select
                    value={cSeverity}
                    onValueChange={(v: "low" | "normal" | "high") =>
                      setCSeverity(v)
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* spacer for balance */}
                <div />
              </div>

              <div>
                <Label className="text-sm font-semibold pb-2">Title</Label>
                <Input
                  value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-semibold pb-2">Details</Label>
                <Textarea
                  rows={5}
                  value={cDetails}
                  onChange={(e) => setCDetails(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  {busy ? "Saving…" : "Submit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* List */}
      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl border bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : !data?.items?.length ? (
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No feedback yet — create the first one.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence initial={false}>
              {data.items.map((it) => (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card className="rounded-2xl border shadow-sm h-full">
                    <CardContent className="p-4 h-full flex flex-col">
                      {/* Header with vote button and title */}
                      <div className="flex items-start gap-3 mb-3">
                        <Button
                          variant={it.hasVoted ? "default" : "outline"}
                          className={
                            it.hasVoted
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2 rounded-lg flex-shrink-0"
                              : "h-8 px-2 rounded-lg flex-shrink-0"
                          }
                          onClick={() => toggleVote(it)}
                        >
                          <ArrowUp className="h-4 w-4" />
                          <span className="ml-1 text-sm">{it.votes}</span>
                        </Button>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                            {it.title}
                          </h3>
                        </div>
                      </div>

                      {/* Chips row */}
                      <div className="flex flex-wrap items-center gap-1 mb-3">
                        <Chip intent={it.kind === "feature" ? "green" : "red"}>
                          {it.kind}
                        </Chip>
                        <Chip
                          intent={
                            it.severity === "high"
                              ? "red"
                              : it.severity === "normal"
                              ? "amber"
                              : "slate"
                          }
                        >
                          {it.severity}
                        </Chip>
                        <StatusChip status={it.status} />
                        {it.pinned && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">
                            Pinned
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
                        {it.details}
                      </p>

                      {/* Footer info */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          by {it.creatorName || it.creatorCode || "unknown"}
                        </div>
                        <div className="flex items-center justify-between">
                          <span>
                            {new Date(it.createdAt).toLocaleDateString()}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquareText className="h-3.5 w-3.5" />
                            {it.comments}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          className="text-xs underline decoration-emerald-300/70 underline-offset-2 hover:text-foreground"
                          onClick={async () => {
                            setExpanded((e) => ({
                              ...e,
                              [it.id]: !e[it.id],
                            }));
                            if (!expanded[it.id]) await loadComments(it.id);
                          }}
                        >
                          {expanded[it.id] ? "Hide" : "View"} details
                        </button>

                        <div className="flex items-center gap-1">
                          {isManager && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 rounded-lg text-xs"
                              onClick={() => setPinned(it, !it.pinned)}
                            >
                              {it.pinned ? (
                                <PinOff className="h-3 w-3 mr-1" />
                              ) : (
                                <Pin className="h-3 w-3 mr-1" />
                              )}
                              {it.pinned ? "Unpin" : "Pin"}
                            </Button>
                          )}

                          {myId && myId === it.createdBy && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:bg-red-50"
                              onClick={() => removeItem(it)}
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Manager status selector */}
                      {isManager && (
                        <div className="mt-2">
                          <Select
                            value={it.status}
                            onValueChange={(v: Item["status"]) =>
                              setStatus(it, v)
                            }
                          >
                            <SelectTrigger className="h-7 w-full rounded-lg text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Open">Open</SelectItem>
                              <SelectItem value="Planned">Planned</SelectItem>
                              <SelectItem value="InProgress">
                                In Progress
                              </SelectItem>
                              <SelectItem value="Done">Done</SelectItem>
                              <SelectItem value="Declined">Declined</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Expanded area - full width modal-like overlay */}
                  {expanded[it.id] && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [it.id]: false }))
                      }
                    >
                      <div
                        className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold">{it.title}</h2>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setExpanded((e) => ({ ...e, [it.id]: false }))
                            }
                          >
                            ×
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div className="whitespace-pre-wrap text-sm">
                            {it.details}
                          </div>

                          {/* Manager-only comment box */}
                          {isManager && (
                            <div className="rounded-xl border p-3">
                              <Label className="text-xs font-semibold">
                                Manager comment
                              </Label>
                              <Textarea
                                rows={3}
                                value={newComment[it.id] || ""}
                                onChange={(e) =>
                                  setNewComment((n) => ({
                                    ...n,
                                    [it.id]: e.target.value,
                                  }))
                                }
                              />
                              <div className="mt-2 flex justify-end">
                                <Button
                                  onClick={() => addComment(it)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 rounded-lg"
                                >
                                  Add comment
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Comments thread */}
                          {(comments[it.id] || []).length > 0 && (
                            <div className="space-y-2">
                              {(comments[it.id] || []).map((c) => (
                                <div
                                  key={c.id}
                                  className="rounded-xl border p-3 bg-gray-50"
                                >
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">
                                      {c.authorName ||
                                        c.authorCode ||
                                        "manager"}
                                    </span>
                                    <span> • </span>
                                    <span>
                                      {new Date(c.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="mt-1 whitespace-pre-wrap text-sm">
                                    {c.message}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
