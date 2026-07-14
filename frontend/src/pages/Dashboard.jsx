import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { api } from "../api/client.js";
import StatCard from "../components/StatCard.jsx";
import TallyBoard from "../components/TallyBoard.jsx";

const COLORS = { present: "#3F8F5B", missing: "#C24A2E", brass: "#C7A44E", command: "#141B17" };

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [active, setActive] = useState([]);
  const [trends, setTrends] = useState(null);
  const [days, setDays] = useState(7);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const [s, a, t] = await Promise.all([api.summary(), api.activeSessions(), api.trends(days)]);
      setSummary(s); setActive(a); setTrends(t);
    } catch (e) { setErr(e.message); }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 6000);
    return () => clearInterval(iv);
  }, [days]);

  const split = trends?.status_split || { complete: 0, missing: 0 };
  const pieData = [
    { name: "Complete", value: split.complete, color: COLORS.present },
    { name: "Missing", value: split.missing, color: COLORS.missing },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display uppercase tracking-wider text-2xl">Overview</h1>
        <div className="inline-flex rounded-md border border-line/30 overflow-hidden">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider transition-colors ${
                days === d ? "bg-command text-white" : "bg-white text-muted hover:bg-stone"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>
      {err && <div className="mb-4 rounded-md bg-missing-soft text-missing text-sm px-3 py-2">{err}</div>}

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active musters" value={summary?.active_sessions ?? "—"} accent="text-brass" />
        <StatCard label="Sites" value={summary?.total_sites ?? "—"} />
        <StatCard label={`Readings · ${days}d`} value={trends?.totals?.events ?? "—"} />
        <StatCard label={`Alerts · ${days}d`} value={trends?.totals?.alerts ?? "—"}
          accent={trends?.totals?.alerts ? "text-missing" : "text-ink"} />
      </div>

      {/* charts */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 lg:col-span-2">
          <div className="eyebrow text-muted mb-3">Attendance trend — avg present vs missing</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends?.daily || []}>
              <defs>
                <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.present} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={COLORS.present} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMissing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.missing} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={COLORS.missing} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E3DB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="avg_present" name="Avg present" stroke={COLORS.present} fill="url(#gPresent)" strokeWidth={2} />
              <Area type="monotone" dataKey="avg_missing" name="Avg missing" stroke={COLORS.missing} fill="url(#gMissing)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <div className="eyebrow text-muted mb-3">Complete vs missing</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4 mb-8">
        <div className="eyebrow text-muted mb-3">Activity by day — readings & alerts</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trends?.daily || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3E3DB" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="events" name="Readings" fill={COLORS.command} radius={[3, 3, 0, 0]} />
            <Bar dataKey="alerts" name="Alerts" fill={COLORS.missing} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* live musters */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="eyebrow text-muted">Live musters</h2>
        <Link to="/sessions" className="text-brass text-xs font-display uppercase tracking-wider hover:underline">Manage →</Link>
      </div>
      {active.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="font-display uppercase tracking-wider text-muted">No active muster</p>
          <p className="text-sm text-muted mt-1">Start a muster, then analyze a photo, video, or live camera against it.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {active.map((s) => {
            const pm = (trends?.per_muster || []).find((m) => m.name === s.name);
            return (
              <Link key={s.id} to={`/sessions/${s.id}`} className="block hover:opacity-95 transition-opacity">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display uppercase tracking-wider">{s.name}</span>
                  <span className="text-xs text-muted">Expected {s.expected_count}</span>
                </div>
                <TallyBoard detected={pm?.present} expected={s.expected_count}
                  status={pm && pm.status !== "AWAITING" ? pm.status : undefined} compact />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
