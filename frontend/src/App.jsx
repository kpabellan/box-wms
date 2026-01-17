import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Scan from "./components/Scan";
import Dashboard from "./components/Dashboard";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    try {
      const me = JSON.parse(localStorage.getItem("me") || "null");
      if (!me || !allowedRoles.includes(me.role)) {
        return <Navigate to="/scan" replace />;
      }
    } catch {
      return <Navigate to="/scan" replace />;
    }
  }

  return children;
};

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleHomeRedirect />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />

        <Route
          path="/scan"
          element={
            <ProtectedRoute allowedRoles={["scanner", "admin", "desktop"]}>
              <Scan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "desktop"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function RoleHomeRedirect() {
  let role = null;
  try {
    role = JSON.parse(localStorage.getItem("me") || "null")?.role || null;
  } catch {
    role = null;
  }

  if (role === "admin" || role === "desktop") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/scan" replace />;
}