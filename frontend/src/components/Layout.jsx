import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Watermark from "./Watermark.jsx";

const nav = [
  { to: "/", label: "Overview", end: true },
  { to: "/sessions", label: "Musters" },
  { to: "/sites", label: "Sites" },
  { to: "/alerts", label: "Alerts" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen md:flex">
      {/* Command sidebar */}
      <aside className="bg-command text-white md:w-60 md:min-h-screen flex md:flex-col">
        <div className="px-6 py-5 border-b border-white/10 flex-1 md:flex-none">
          <div className="font-display uppercase tracking-[0.2em] text-brass text-sm leading-tight">Parade</div>
          <div className="font-display uppercase tracking-[0.2em] text-white text-lg leading-tight">Muster</div>
        </div>
        <nav className="flex md:flex-col md:mt-4 md:px-3 md:gap-1 px-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `px-4 py-3 md:rounded-md font-display uppercase tracking-wider text-sm transition-colors ${
                  isActive ? "bg-brass text-command" : "text-white/70 hover:text-white hover:bg-white/5"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block mt-auto px-6 py-5 border-t border-white/10">
          <div className="text-xs text-white/50 truncate">{user?.full_name}</div>
          <button onClick={logout} className="mt-2 text-brass text-xs font-display uppercase tracking-wider hover:text-brass-bright">
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <header className="border-b border-line/20 bg-white px-6 md:px-8 py-4 flex items-center justify-between">
          <div className="eyebrow text-muted">Personnel Accountability · Command Console</div>
          <button onClick={logout} className="md:hidden text-missing text-xs font-display uppercase tracking-wider">Sign out</button>
        </header>
        <div className="px-6 md:px-8 py-6 max-w-6xl">{children}</div>
        <div className="px-6 md:px-8"><Watermark /></div>
      </main>
    </div>
  );
}
