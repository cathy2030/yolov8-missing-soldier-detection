export default function StatusBadge({ status }) {
  const complete = status === "COMPLETE";
  const missing = status === "MISSING";
  const cls = complete
    ? "bg-complete-soft text-complete"
    : missing
    ? "bg-missing-soft text-missing"
    : "bg-stone text-muted";
  const label = complete ? "Complete" : missing ? "Missing" : status || "—";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-display uppercase tracking-wider ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${complete ? "bg-complete" : missing ? "bg-missing" : "bg-muted"}`} />
      {label}
    </span>
  );
}
