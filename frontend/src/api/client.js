const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body, form, auth = true, headers = {} } = {}) {
  const h = { ...headers };
  const opts = { method, headers: h };
  if (form) {
    opts.body = new URLSearchParams(form).toString();
    h["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (body !== undefined) {
    opts.body = JSON.stringify(body);
    h["Content-Type"] = "application/json";
  }
  if (auth) {
    const t = getToken();
    if (t) h["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${API}${path}`, opts);
  if (res.status === 401 && !path.includes("/auth/login")) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return null;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

// multipart upload (image file OR webcam blob)
async function uploadFile(path, file, filename = "frame.jpg") {
  const fd = new FormData();
  fd.append("file", file, filename);
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof e.detail === "string" ? e.detail : "Upload failed");
  }
  return res.json();
}

export const api = {
  login: (username, password) => request("/api/auth/login", { method: "POST", form: { username, password }, auth: false }),
  me: () => request("/api/auth/me"),
  summary: () => request("/api/dashboard/summary"),
  trends: (days = 7) => request(`/api/dashboard/trends?days=${days}`),
  sites: () => request("/api/sites"),
  createSite: (b) => request("/api/sites", { method: "POST", body: b }),
  deleteSite: (id) => request(`/api/sites/${id}`, { method: "DELETE" }),
  sessions: () => request("/api/sessions"),
  activeSessions: () => request("/api/sessions/active"),
  createSession: (b) => request("/api/sessions", { method: "POST", body: b }),
  updateSession: (id, b) => request(`/api/sessions/${id}`, { method: "PATCH", body: b }),
  endSession: (id) => request(`/api/sessions/${id}/end`, { method: "POST" }),
  session: (id) => request(`/api/sessions/${id}`),
  events: (sid) => request(`/api/events${sid ? `?session_id=${sid}` : ""}`),
  alerts: () => request("/api/alerts"),
  clearAlerts: () => request("/api/alerts", { method: "DELETE" }),
  analyzeImage: (id, file, filename) => uploadFile(`/api/sessions/${id}/analyze-image`, file, filename),
  analyzeVideo: (id, file, filename) => uploadFile(`/api/sessions/${id}/analyze-video`, file, filename),
};

export { API };
