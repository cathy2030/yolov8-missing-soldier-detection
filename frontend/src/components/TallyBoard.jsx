// Signature element: the muster tally board.
// Reads like a parade-ground count board — present over expected, with a status band.
export default function TallyBoard({ detected, expected, status, compact = false }) {
  const missing = status === "MISSING";
  const known = typeof detected === "number" && typeof expected === "number";
  const shortfall = known ? Math.max(0, expected - detected) : null;
  const band = missing ? "bg-missing" : status === "COMPLETE" ? "bg-complete" : "bg-line";

  return (
    <div className="overflow-hidden rounded-lg border border-line/25 bg-command text-white">
      <div className={`h-1.5 w-full ${band}`} />
      <div className={`flex items-end justify-between gap-6 px-6 ${compact ? "py-4" : "py-6"}`}>
        <div>
          <div className="eyebrow text-brass">On Parade</div>
          <div className="flex items-baseline gap-2">
            <span className={`num font-display font-600 leading-none ${compact ? "text-5xl" : "text-7xl"}`}>
              {known ? detected : "—"}
            </span>
            <span className="num font-display text-2xl text-white/50">/ {known ? expected : "—"}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow text-white/40">Status</div>
          <div className={`font-display uppercase tracking-wider ${compact ? "text-lg" : "text-2xl"} ${missing ? "text-missing" : status === "COMPLETE" ? "text-complete" : "text-white/60"}`}>
            {missing ? `${shortfall} Missing` : status === "COMPLETE" ? "All Present" : "Awaiting"}
          </div>
        </div>
      </div>
    </div>
  );
}
