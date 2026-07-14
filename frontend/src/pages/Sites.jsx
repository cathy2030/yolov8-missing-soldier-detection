import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import Field from "../components/Field.jsx";

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({ name: "", location: "", default_expected_count: 0 });
  const [err, setErr] = useState("");

  async function load() {
    try { setSites(await api.sites()); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.createSite({ ...form, default_expected_count: Number(form.default_expected_count) });
      setForm({ name: "", location: "", default_expected_count: 0 });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function remove(id) {
    if (!confirm("Remove this site and its musters?")) return;
    await api.deleteSite(id);
    load();
  }

  return (
    <div>
      <h1 className="font-display uppercase tracking-wider text-2xl mb-2">Sites</h1>
      <p className="text-muted text-sm mb-6">A site is a place where parades are held. Add one before starting a muster.</p>
      {err && <div className="mb-4 rounded-md bg-missing-soft text-missing text-sm px-3 py-2">{err}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <form onSubmit={create} className="card p-5 md:col-span-1 h-fit space-y-4">
          <div className="eyebrow text-muted">Add a site</div>

          <Field label="Name" help="A short name for this parade location, e.g. the barracks or base it belongs to.">
            <input className="field" placeholder="e.g. Mogadishu Cantonment"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>

          <Field label="Location" help="Where the site is — city or area. Shown on alerts so an officer knows which base is affected.">
            <input className="field" placeholder="e.g. Asokoro, Abuja"
              value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>

          <Field label="Default expected count" help="The usual number of soldiers on parade here. Used as the starting figure when you create a muster — you can change it per muster.">
            <input className="field" type="number" min="0" placeholder="e.g. 8"
              value={form.default_expected_count}
              onChange={(e) => setForm({ ...form, default_expected_count: e.target.value })} />
          </Field>

          <button className="btn-brass w-full">Add site</button>
        </form>

        <div className="md:col-span-2 space-y-3">
          {sites.length === 0 && <div className="card px-6 py-10 text-center text-muted">No sites yet. Add your first parade ground.</div>}
          {sites.map((s) => (
            <div key={s.id} className="card px-5 py-4 flex items-center justify-between">
              <div>
                <div className="font-display uppercase tracking-wider">{s.name}</div>
                <div className="text-sm text-muted">{s.location || "—"} · expected {s.default_expected_count}</div>
              </div>
              <button className="btn-danger" onClick={() => remove(s.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
