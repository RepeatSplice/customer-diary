export function parseDiariesQuery(searchParams: URLSearchParams) {
  return {
    text: searchParams.get("q") || undefined,
    status: searchParams.get("status") || undefined,
    priority: searchParams.get("priority") || undefined,
    overdue: searchParams.get("overdue") === "1",
    archived: searchParams.get("archived") === "1" ? 1 : 0,
    limit: Math.min(parseInt(searchParams.get("limit") || "50"), 200),
    offset: Math.max(parseInt(searchParams.get("offset") || "0"), 0),
  } as const;
}
