import { useEffect, useState } from "react";
import { api, API } from "../api/client.js";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    try { setAlerts(await api.alerts()); } catch (e) { setErr(e.message); }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function clearAll() {
    if (!confirm("Clear all alerts? This cannot be undone.")) return;
    try { await api.clearAlerts(); setAlerts([]); } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display uppercase tracking-wider text-2xl">Alerts</h1>
          <p className="text-muted text-sm">Every shortfall is recorded here with its evidence frame.</p>
        </div>
        {alerts.length > 0 && (
          <button className="btn-ghost" onClick={clearAll}>Clear all</button>
        )}
      </div>
      {err && <div className="mb-4 rounded-md bg-missing-soft text-missing text-sm px-3 py-2">{err}</div>}

      {alerts.length === 0 ? (
        <div className="card px-6 py-10 text-center text-muted">
          <p className="font-display uppercase tracking-wider">No alerts</p>
          <p className="text-sm mt-1">A shortfall on any active muster will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="card p-4 flex gap-4 items-start">
              {a.image_url ? (
                <img src={`${API}${a.image_url}`} alt="Alert evidence" className="w-28 h-20 object-cover rounded-md border border-line/25 shrink-0" />
              ) : (
                <div className="w-28 h-20 rounded-md bg-stone border border-line/20 shrink-0 flex items-center justify-center text-xs text-muted">No frame</div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-missing-soft text-missing px-2.5 py-1 text-xs font-display uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-missing" /> {a.missing_count} missing
                  </span>
                  <span className="text-xs text-muted">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <pre className="mt-2 text-sm text-ink whitespace-pre-wrap font-body">{a.message}</pre>
                <p className="mt-1 text-xs text-muted">
                  {a.delivered ? `Notified via ${a.channels || "—"}` : "Recorded (no channel configured)"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
