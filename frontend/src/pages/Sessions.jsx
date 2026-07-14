import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import Field from "../components/Field.jsx";

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({ site_id: "", name: "", expected_count: 0 });
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState(0);

  async function load() {
    try {
      const [ss, si] = await Promise.all([api.sessions(), api.sites()]);
      setSessions(ss);
      setSites(si);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  // when a site is picked, prefill expected from its default
  function pickSite(id) {
    const site = sites.find((s) => String(s.id) === String(id));
    setForm({ ...form, site_id: id, expected_count: site ? site.default_expected_count : form.expected_count });
  }

  async function start(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.createSession({
        site_id: Number(form.site_id),
        name: form.name,
        expected_count: Number(form.expected_count),
      });
      setForm({ site_id: "", name: "", expected_count: 0 });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function end(id) { await api.endSession(id); load(); }

  function beginEdit(s) { setEditId(s.id); setEditVal(s.expected_count); }
  async function saveEdit(id) {
    try {
      await api.updateSession(id, { expected_count: Number(editVal) });
      setEditId(null);
      load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <h1 className="font-display uppercase tracking-wider text-2xl mb-2">Musters</h1>
      <p className="text-muted text-sm mb-6">A muster is one parade check. Start one, then analyze a photo, video, or live camera against it.</p>
      {err && <div className="mb-4 rounded-md bg-missing-soft text-missing text-sm px-3 py-2">{err}</div>}

      <form onSubmit={start} className="card p-5 mb-6 grid md:grid-cols-4 gap-4 items-end">
        <Field label="Site" help="Which parade location this muster is for. Add sites on the Sites tab.">
          <select className="field" value={form.site_id} onChange={(e) => pickSite(e.target.value)} required>
            <option value="">Select…</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Muster name" help="A label for this specific parade, usually the time or occasion, e.g. '0800 Morning Muster'.">
          <input className="field" value={form.name} placeholder="e.g. 0800 Morning Muster"
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Expected count" help="How many soldiers should be present. If fewer are detected, the system flags a shortfall and alerts you.">
          <input className="field" type="number" min="0" placeholder="e.g. 8"
            value={form.expected_count} onChange={(e) => setForm({ ...form, expected_count: e.target.value })} required />
        </Field>
        <button className="btn-brass">Start muster</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted eyebrow border-b border-line/20">
              <th className="px-5 py-3 font-medium">Muster</th>
              <th className="px-5 py-3 font-medium">Expected</th>
              <th className="px-5 py-3 font-medium">State</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr><td colSpan="4" className="px-5 py-10 text-center text-muted">No musters yet.</td></tr>
            )}
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-line/10 last:border-0 hover:bg-stone/60">
                <td className="px-5 py-3">
                  <Link to={`/sessions/${s.id}`} className="font-display uppercase tracking-wide hover:text-brass">{s.name}</Link>
                </td>
                <td className="px-5 py-3">
                  {editId === s.id ? (
                    <span className="inline-flex items-center gap-2">
                      <input type="number" min="0" value={editVal} onChange={(e) => setEditVal(e.target.value)}
                        className="w-20 border border-line/40 rounded px-2 py-1 num" autoFocus />
                      <button className="text-brass text-xs font-display uppercase" onClick={() => saveEdit(s.id)}>Save</button>
                      <button className="text-muted text-xs" onClick={() => setEditId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="num">{s.expected_count}</span>
                      <button className="text-muted text-xs underline hover:text-brass" onClick={() => beginEdit(s)}>edit</button>
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {s.status === "active"
                    ? <span className="text-complete font-display uppercase tracking-wider text-xs">● Active</span>
                    : <span className="text-muted font-display uppercase tracking-wider text-xs">Ended</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  {s.status === "active"
                    ? <button className="btn-danger" onClick={() => end(s.id)}>End</button>
                    : <Link to={`/sessions/${s.id}`} className="text-brass text-xs font-display uppercase tracking-wider">View</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
