import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    api.me().then(setUser).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { access_token } = await api.login(email, password);
    localStorage.setItem("token", access_token);
    const me = await api.me();
    setUser(me);
    return me;
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login";
  }

  return <AuthCtx.Provider value={{ user, loading, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
