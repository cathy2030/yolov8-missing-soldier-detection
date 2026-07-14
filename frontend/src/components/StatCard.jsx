export default function StatCard({ label, value, accent }) {
  return (
    <div className="card px-5 py-4">
      <div className="eyebrow text-muted">{label}</div>
      <div className={`num font-display text-4xl mt-1 ${accent || "text-ink"}`}>{value}</div>
    </div>
  );
}
