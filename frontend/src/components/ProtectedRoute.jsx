import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted font-display uppercase tracking-widest">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
