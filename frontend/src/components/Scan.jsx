// src/components/ScanScreen.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

function detectType(decodedText) {
  const raw = String(decodedText || "").trim();
  if (!raw) return null;

  // JSON format support
  try {
    const obj = JSON.parse(raw);
    if (obj?.app === "msp" && (obj.type === "incoming" || obj.type === "outgoing")) {
      return obj.type;
    }
  } catch {
    // ignore JSON parse errors
  }

  const t = raw.toLowerCase();
  if (t === "msp://incoming") return "incoming";
  if (t === "msp://outgoing") return "outgoing";

  return null;
}

export default function ScanScreen() {
  const qrRef = useRef(null);
  const isTransitioningRef = useRef(false);

  // Locks UI from processing additional codes while in confirm UI
  const lockedRef = useRef(false);

  // Prevent instant duplicate detections
  const lastCodeRef = useRef("");

  const [status, setStatus] = useState("Initializing camera…");
  const [scanType, setScanType] = useState(null); // "incoming" | "outgoing" | null
  const [rawCode, setRawCode] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Only required for outgoing
  const [destination, setDestination] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const showConfirm = useMemo(() => scanType !== null, [scanType]);
  const needsDestination = scanType === "outgoing";

  const startScanner = async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    try {
      if (!qrRef.current) qrRef.current = new Html5Qrcode("scanner");

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setStatus("No camera found. Check permissions and HTTPS on iOS Safari.");
        return;
      }

      setStatus("Ready to scan QR code");

      await qrRef.current.start(
        { facingMode: "environment" },
        { fps: 30, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          if (lockedRef.current) return;

          const trimmed = String(decodedText || "").trim();
          if (!trimmed) return;

          if (trimmed === lastCodeRef.current) return;

          const type = detectType(trimmed);
          if (!type) return;

          lastCodeRef.current = trimmed;
          lockedRef.current = true;

          setScanType(type);
          setRawCode(trimmed);
          setQuantity(1);
          setDestination("1"); // reset on every valid scan
          setStatus(
            `Detected ${type.toUpperCase()} QR. Choose ${type === "outgoing" ? "destination and " : ""}quantity and submit.`
          );

          // Pause scanning while confirming
          try {
            if (typeof qrRef.current.pause === "function") {
              qrRef.current.pause(true);
            } else {
              await qrRef.current.stop();
            }
          } catch {
            // ignore
          }
        },
        () => {
          // ignore per-frame decode errors
        }
      );
    } catch (err) {
      console.error(err);
      if (!showConfirm) {
        setStatus(
          "Camera failed to start. On iOS Safari you must use HTTPS and allow camera permission."
        );
      }
    } finally {
      isTransitioningRef.current = false;
    }
  };

  const stopAndClearScanner = async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    try {
      if (!qrRef.current) return;

      try {
        if (typeof qrRef.current.resume === "function") qrRef.current.resume();
      } catch {
        // ignore
      }

      try {
        await qrRef.current.stop();
      } catch {
        // ignore
      }

      try {
        await qrRef.current.clear();
      } catch {
        // ignore
      }
    } finally {
      isTransitioningRef.current = false;
    }
  };

  const resumeScanner = async () => {
    lastCodeRef.current = "";

    const inst = qrRef.current;
    if (!inst) {
      await startScanner();
      return;
    }

    try {
      if (typeof inst.resume === "function") {
        inst.resume();
        setStatus("Ready to scan QR code");
        return;
      }
    } catch {
      // ignore
    }

    await startScanner();
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopAndClearScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rescan = async () => {
    if (submitting) return;

    lockedRef.current = false;
    setScanType(null);
    setRawCode("");
    setQuantity(1);
    setDestination("1");
    setStatus("Ready to scan QR code");

    await resumeScanner();
  };

  const submit = async () => {
    if (!scanType) return;

    if (quantity < 1 || quantity > 10) {
      setStatus("Quantity must be 1–10.");
      return;
    }

    // Compute destination number once, in outer scope
    const d = needsDestination ? Number(destination) : null;

    if (needsDestination) {
      if (!Number.isInteger(d) || d < 1 || d > 5) {
        setStatus("Destination must be 1–5.");
        return;
      }
    }

    setSubmitting(true);
    setStatus("Submitting…");

    try {
      const token = localStorage.getItem("token");

      const body = {
        qrCode: rawCode,
        quantity,
        ...(needsDestination ? { destination: d } : {}),
      };

      const res = await fetch(`/api/${scanType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      // Auto-logout on auth failure
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("me");
        setSubmitting(false);
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        setStatus(`Error ${res.status}: ${text || "Request failed"}`);
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setShowSuccessMessage(true);
      setStatus(
        `Submitted ${scanType.toUpperCase()} x${quantity}${needsDestination ? ` to Ranch ${destination}` : ""
        }. Scan next.`
      );
      
      // Hide success message after 2 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 2000);
      
      await rescan();
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      setStatus("Network error. Check backend reachability (LAN IP / proxy / firewall).");
    }
  };

  return (
    <div style={{ 
      maxWidth: "600px", 
      margin: "0 auto", 
      padding: "12px",
      minHeight: "100vh"
    }}>
      <style>{`
        #scanner {
          aspect-ratio: 1 / 1 !important;
        }
        #scanner video {
          aspect-ratio: 1 / 1 !important;
          object-fit: cover !important;
        }
        #scanner div[style*="border"],
        #scanner div[style*="width"] {
          aspect-ratio: 1 / 1 !important;
        }
      `}</style>
      <div
        id="scanner"
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          maxHeight: "500px",
          minHeight: "300px",
          border: "2px solid #3b82f6",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#000",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}
      />

      <div style={{ 
        marginTop: "16px", 
        fontSize: "14px",
        padding: "12px",
        background: "#f0f9ff",
        border: "1px solid #bfdbfe",
        borderRadius: "6px",
        textAlign: "center",
        color: "#1e40af"
      }}>
        {status}
      </div>

      {showSuccessMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#10b981",
          color: "white",
          padding: "16px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          fontSize: "16px",
          fontWeight: "600",
          zIndex: 1000,
          animation: "slideDown 0.3s ease-out"
        }}>
          ✓ Submitted
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      {showConfirm && (
        <div style={{ 
          marginTop: "20px",
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ 
            marginBottom: "16px", 
            fontWeight: "600",
            fontSize: "16px",
            color: scanType === "incoming" ? "#1e40af" : "#991b1b",
            padding: "12px",
            background: scanType === "incoming" ? "#dbeafe" : "#fee2e2",
            borderRadius: "6px",
            textAlign: "center"
          }}>
            {scanType.toUpperCase()} detected
          </div>

          {needsDestination && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px",
                fontWeight: "500",
                fontSize: "14px",
                color: "#374151"
              }}>
                Destination (Ranch 1–5)
              </label>

              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  fontSize: "16px", 
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.6 : 1
                }}
                disabled={submitting}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    Ranch {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px",
              fontWeight: "500",
              fontSize: "14px",
              color: "#374151"
            }}>
              Quantity (1–10)
            </label>

            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{ 
                width: "100%", 
                padding: "12px", 
                fontSize: "16px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1
              }}
              disabled={submitting}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div style={{ 
            display: "flex", 
            gap: "12px",
            flexDirection: "row"
          }}>
            <button
              onClick={submit}
              disabled={submitting}
              style={{ 
                flex: 1, 
                padding: "14px", 
                fontSize: "16px",
                fontWeight: "600",
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? "not-allowed" : "pointer"
              }}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>

            <button
              onClick={rescan}
              disabled={submitting}
              style={{ 
                flex: 1, 
                padding: "14px", 
                fontSize: "16px",
                fontWeight: "600",
                background: "#e5e7eb",
                color: "#111",
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? "not-allowed" : "pointer"
              }}
            >
              {submitting ? "Please wait…" : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
