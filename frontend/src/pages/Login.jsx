import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Watermark from "../components/Watermark.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Command panel */}
      <div className="bg-command text-white flex flex-col justify-between p-10">
        <div>
          <div className="font-display uppercase tracking-[0.2em] text-brass">Parade</div>
          <div className="font-display uppercase tracking-[0.2em] text-4xl">Muster</div>
        </div>
        <div>
          <div className="h-1.5 w-16 bg-brass mb-4" />
          <p className="font-display uppercase tracking-wider text-white/70 text-lg leading-relaxed max-w-sm">
            Real-time personnel accountability for the parade ground.
          </p>
          <p className="text-white/40 text-sm mt-3 max-w-sm">
            Detect, count, and confirm every soldier on formation — and know the moment the number falls short.
          </p>
        </div>
        <div className="text-white/30 text-xs">University of Abuja · Department of Computer Science</div>
      </div>

      {/* Sign in */}
      <div className="flex items-center justify-center p-8 bg-stone">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h1 className="font-display uppercase tracking-wider text-2xl mb-1">Sign in</h1>
          <p className="text-muted text-sm mb-6">Duty officer access</p>

          {error && (
            <div className="mb-4 rounded-md bg-missing-soft text-missing text-sm px-3 py-2">{error}</div>
          )}

          <label className="label">Email</label>
          <input className="field mb-4" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />

          <label className="label">Password</label>
          <input className="field mb-6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <button className="btn-brass w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <div className="mt-8"><Watermark /></div>
        </form>
      </div>
    </div>
  );
}
