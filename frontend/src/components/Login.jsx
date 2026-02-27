import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ---------- Media Query Hook ---------- */
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

/* ---------- Login / Signup Page ---------- */
export default function Login() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 640px)");

  const [isSignup, setIsSignup] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------- Submit Handler ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(isSignup ? "/api/signup" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup
            ? { username, password, fullName }
            : { username, password }
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Request failed");
        return;
      }

      // Signup success → return to login
      if (isSignup) {
        setIsSignup(false);
        setFullName("");
        setPassword("");
        setErr("Account created. You can log in now.");
        return;
      }

      // Login success
      localStorage.setItem("token", data.token);
      localStorage.setItem("me", JSON.stringify(data.user));
      navigate("/dashboard", { replace: true });
    } catch {
      setErr("Server error. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "16px" : "20px",
        background: "#faf9f6",
      }}
    >
      <div
        style={{
          maxWidth: isMobile ? "100%" : "380px",
          width: "100%",
          background: "white",
          padding: isMobile ? "24px" : "32px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "24px",
            fontSize: isMobile ? "24px" : "28px",
            textAlign: "center",
            color: "#4B6859",
          }}
        >
          MSP Scanner
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Full Name (Signup only) */}
          {isSignup && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500" }}>
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: isMobile ? "12px" : "10px",
                  fontSize: isMobile ? "16px" : "14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                }}
              />
            </div>
          )}

          {/* Username */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", fontWeight: "500" }}>
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
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", fontWeight: "500" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              style={{
                width: "100%",
                padding: isMobile ? "12px" : "10px",
                fontSize: isMobile ? "16px" : "14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* Error / Info */}
          {err && (
            <div
              style={{
                color: "#8D2222",
                background: "#f5ebe9",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "16px",
                fontSize: "14px",
                border: "1px solid #d9b5b0",
              }}
            >
              {err}
            </div>
          )}

          {/* Submit */}
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
            }}
          >
            {loading
              ? isSignup
                ? "Creating account..."
                : "Logging in..."
              : isSignup
              ? "Sign Up"
              : "Login"}
          </button>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: "center", fontSize: "14px" }}>
          {isSignup ? (
            <>
              Already have an account?{" "}
              <span
                style={{ color: "#4B6859", cursor: "pointer" }}
                onClick={() => setIsSignup(false)}
              >
                Login
              </span>
            </>
          ) : (
            <>
              Don’t have an account?{" "}
              <span
                style={{ color: "#4B6859", cursor: "pointer" }}
                onClick={() => setIsSignup(true)}
              >
                Sign up
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
