import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
};

async function hydrateMe(token) {
  try {
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    localStorage.setItem("me", JSON.stringify(data));
    return data;
  } catch {
    return null;
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [menuOpen, setMenuOpen] = useState(false);

  const token = localStorage.getItem("token");
  const onLoginPage = location.pathname === "/login";

  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("me") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!token) return;

    hydrateMe(token).then((fresh) => {
      if (fresh) setMe(fresh);
      else {
        localStorage.removeItem("token");
        localStorage.removeItem("me");
        navigate("/login", { replace: true });
      }
    });
  }, [token]);


  if (!token || onLoginPage) return null;

  const displayName = (me?.name || me?.username || "User").toUpperCase();

  const canViewDashboard = me?.role === "admin" || me?.role === "desktop";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("me");
    navigate("/login", { replace: true });
  };

  const NavLink = ({ to, label }) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      style={{
        textDecoration: "none",
        color: location.pathname === to ? "#B28C6A" : "#fff",
        fontWeight: location.pathname === to ? "600" : "normal",
        transition: "color 0.2s",
        fontSize: isMobile ? "14px" : "15px"
      }}
    >
      {label}
    </Link>
  );

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#4B6859",
        borderBottom: "1px solid #396245",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: isMobile ? "12px" : "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isMobile ? "12px" : "20px",
        }}
      >
        <Link
          to={canViewDashboard ? "/dashboard" : "/scan"}
          style={{ textDecoration: "none", color: "#fff", display: "flex", alignItems: "center" }}
        >
          <strong style={{ fontSize: isMobile ? "16px" : "18px" }}>MSP</strong>
        </Link>

        {!isMobile && (
          <nav style={{ display: "flex", gap: "24px" }}>
            {canViewDashboard && <NavLink to="/dashboard" label="Dashboard" />}
            <NavLink to="/scan" label="Scan" />
          </nav>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "12px", marginLeft: "auto" }}>
          {!isMobile && (
            <span style={{ fontSize: "13px", color: "#fff", whiteSpace: "nowrap" }}>
              Logged in as: {displayName}
            </span>
          )}

          {isMobile && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "none",
                border: "1px solid #d1d5db",
                padding: "6px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ☰
            </button>
          )}

          <button
            onClick={logout}
            style={{
              padding: isMobile ? "6px 10px" : "8px 12px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              background: "transparent",
              cursor: "pointer",
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: "500",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              color: "#fff"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }}
          >
            {isMobile ? "Log out" : "Logout"}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobile && menuOpen && (
        <div
          style={{
            background: "#396245",
            borderTop: "1px solid #2a4a34",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {canViewDashboard && <NavLink to="/dashboard" label="Dashboard" />}
          <NavLink to="/scan" label="Scan" />
          <div style={{ fontSize: "13px", color: "#fff", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}>
            Logged in as: {displayName}
          </div>
        </div>
      )}
    </header>
  );
}