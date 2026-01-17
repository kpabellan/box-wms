import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 640px)");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setErr("Invalid username or password");
        return;
      }

      const data = await res.json();

      if (!data.token) {
        setErr("Login failed: token missing");
        return;
      }

      localStorage.setItem("token", data.token);

      if (data.user) {
        localStorage.setItem("me", JSON.stringify(data.user));
      } else {
        localStorage.removeItem("me");
      }

      navigate("/dashboard", { replace: true });
    } catch {
      setErr("Server error. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? "16px" : "20px",
      background: "#faf9f6"
    }}>
      <div style={{
        maxWidth: isMobile ? "100%" : "380px",
        width: "100%",
        background: "white",
        padding: isMobile ? "24px" : "32px",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e5e7eb"
      }}>
        <h2 style={{
          marginTop: 0,
          marginBottom: "24px",
          fontSize: isMobile ? "24px" : "28px",
          textAlign: "center",
          color: "#4B6859"
        }}>
          MSP Scanner
        </h2>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#374151"
            }}>
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              style={{ 
                width: "100%", 
                padding: isMobile ? "12px" : "10px",
                fontSize: isMobile ? "16px" : "14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                boxSizing: "border-box",
                transition: "border-color 0.2s"
              }}
            />
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#374151"
            }}>
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              type="password"
              disabled={loading}
              style={{ 
                width: "100%", 
                padding: isMobile ? "12px" : "10px",
                fontSize: isMobile ? "16px" : "14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                boxSizing: "border-box",
                transition: "border-color 0.2s"
              }}
            />
          </div>

          {err && (
            <div style={{ 
              color: "#8D2222",
              background: "#f5ebe9",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "14px",
              border: "1px solid #d9b5b0"
            }}>
              {err}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: "100%", 
              padding: isMobile ? "12px" : "10px",
              fontSize: isMobile ? "16px" : "14px",
              fontWeight: "600",
              marginBottom: "12px",
              background: "#4B6859",
              color: "white",
              border: "none",
              borderRadius: "6px",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = "#396245";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = "#4B6859";
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}