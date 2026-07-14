import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Sites from "./pages/Sites.jsx";
import Sessions from "./pages/Sessions.jsx";
import SessionDetail from "./pages/SessionDetail.jsx";
import Alerts from "./pages/Alerts.jsx";

function Shell({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Dashboard /></Shell>} />
      <Route path="/sites" element={<Shell><Sites /></Shell>} />
      <Route path="/sessions" element={<Shell><Sessions /></Shell>} />
      <Route path="/sessions/:id" element={<Shell><SessionDetail /></Shell>} />
      <Route path="/alerts" element={<Shell><Alerts /></Shell>} />
    </Routes>
  );
}
