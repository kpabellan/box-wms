import React, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const todayString = getTodayString();

  const [view, setView] = useState("today");
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [dailyData, setDailyData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [destinationData, setDestinationData] = useState([]);
  const [dayDetails, setDayDetails] = useState([]);
  const [onHand, setOnHand] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");
  const isToday = selectedDate === todayString;

  // Reset to today's view when dashboard mounts or navigates
  useEffect(() => {
    setView("today");
    setSelectedDate(todayString);
  }, [todayString]);

  // When date selector changes, switch to day view to show that date
  useEffect(() => {
    if (selectedDate !== todayString && view !== "today") {
      setView("today");
    }
  }, [selectedDate, todayString]);

  useEffect(() => {
    if (!token) return;
    fetchOnHand();
  }, [token]);

  const getDateRange = (viewType, date) => {
    const d = new Date(date);
    let startDate, endDate;

    if (viewType === "today") {
      startDate = date;
      endDate = date;
    } else if (viewType === "week") {
      const first = new Date(d.setDate(d.getDate() - d.getDay()));
      startDate = first.toISOString().split("T")[0];
      const last = new Date(d.setDate(d.getDate() + 6));
      endDate = last.toISOString().split("T")[0];
    } else if (viewType === "month") {
      startDate = date.substring(0, 7) + "-01";
      const year = parseInt(date.substring(0, 4));
      const month = parseInt(date.substring(5, 7));
      const lastDay = new Date(year, month, 0).getDate();
      endDate = date.substring(0, 7) + "-" + String(lastDay).padStart(2, "0");
    } else if (viewType === "day-detail") {
      startDate = date;
      endDate = date;
    }

    return { startDate, endDate };
  };

  const fetchOnHand = async () => {
    try {
      const res = await fetch("/api/dashboard/on-hand", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch on-hand inventory");
      const data = await res.json();
      setOnHand(Number(data.onHand) || 0);
    } catch (err) {
      console.error(err);
      // optional: setError(err.message);
    }
  };

  const fetchDailyData = async (viewType, date) => {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRange(viewType, date);

      const dailyResponse = await fetch(`/api/dashboard/daily?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!dailyResponse.ok) throw new Error("Failed to fetch daily data");
      const dailyResult = await dailyResponse.json();

      const destinationResponse = await fetch(`/api/dashboard/destinations?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!destinationResponse.ok) throw new Error("Failed to fetch destination data");
      const destinationResult = await destinationResponse.json();

      setDailyData(dailyResult.data || []);
      setDestinationData(destinationResult.data || []);
      console.log("Destination API Response:", destinationResult.data);

      // Also fetch day details if in "today" view
      if (viewType === "today") {
        const dayDetailsResponse = await fetch(`/api/dashboard/day-details?date=${date}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!dayDetailsResponse.ok) throw new Error("Failed to fetch day details");
        const dayDetailsResult = await dayDetailsResponse.json();
        setDayDetails(dayDetailsResult.data || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHourlyData = async (date) => {
    setLoading(true);
    setError(null);
    try {
      const hourlyResponse = await fetch(`/api/dashboard/hourly?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!hourlyResponse.ok) throw new Error("Failed to fetch hourly data");
      const hourlyResult = await hourlyResponse.json();

      const dayDetailsResponse = await fetch(`/api/dashboard/day-details?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!dayDetailsResponse.ok) throw new Error("Failed to fetch day details");
      const dayDetailsResult = await dayDetailsResponse.json();

      setHourlyData(hourlyResult.data || []);
      setDayDetails(dayDetailsResult.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData(view, selectedDate);
  }, [view, selectedDate, token]);

  const getChartData = () => {
    // Transform daily data for chart
    const byDate = {};
    dailyData.forEach((item) => {
      const date = item.date;
      if (!byDate[date]) byDate[date] = {};
      byDate[date][item.action] = item.total;
    });

    return Object.entries(byDate)
      .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
      .map(([date, actions]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        incoming: actions.incoming || 0,
        outgoing: actions.outgoing || 0,
      }));
  };

  const chartData = getChartData();

  // Prepare summary stats
  let totalIncoming = 0;
  let totalOutgoing = 0;

  totalIncoming = dailyData
    .filter(item => item.action === "incoming")
    .reduce((sum, item) => sum + (item.total || 0), 0);
  totalOutgoing = dailyData
    .filter(item => item.action === "outgoing")
    .reduce((sum, item) => sum + (item.total || 0), 0);

  const COLORS = ["#B28C6A", "#8D2222", "#396245", "#817E5E", "#4B6859"];

  const formatDestinationData = () => {
    if (!destinationData || destinationData.length === 0) return [];
    return destinationData.map((item) => ({
      name: item.destination ? `Ranch ${item.destination}` : "Unknown",
      value: Number(item.total) || 0,
    })).filter(item => item.value > 0);
  };

  return (
    <div style={{
      padding: isMobile ? "12px" : "20px",
      maxWidth: "1400px",
      margin: "0 auto",
      background: "#faf9f6",
      minHeight: "100vh"
    }}>
      <h1 style={{
        marginBottom: "24px",
        fontSize: isMobile ? "24px" : "32px",
        marginTop: 0
      }}>Box Warehouse Dashboard</h1>

      {error && (
        <div style={{
          color: "#8D2222",
          background: "#f5ebe9",
          padding: isMobile ? "12px" : "16px", 
          marginBottom: "20px",
          borderRadius: "8px",
          border: "1px solid #d9b5b0"
        }}>
          {error}
        </div>
      )}

      {/* View Controls - Responsive */}
      <div style={{
        marginBottom: "24px",
        display: "flex",
        gap: isMobile ? "6px" : "10px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <button
          onClick={() => setView("today")}
          style={{
            padding: isMobile ? "6px 12px" : "8px 16px",
            fontSize: isMobile ? "12px" : "14px",
            background: view === "today" ? "#4B6859" : "#e5e7eb",
            color: view === "today" ? "white" : "#111",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: view === "today" ? "bold" : "normal",
            transition: "all 0.2s",
            whiteSpace: "nowrap"
          }}
        >
          Day
        </button>
        <button
          onClick={() => {
            setView("week");
            setSelectedDate(todayString);
          }}
          style={{
            padding: isMobile ? "6px 12px" : "8px 16px",
            fontSize: isMobile ? "12px" : "14px",
            background: view === "week" ? "#4B6859" : "#e5e7eb",
            color: view === "week" ? "white" : "#111",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: view === "week" ? "bold" : "normal",
            transition: "all 0.2s",
            whiteSpace: "nowrap"
          }}
        >
          Week
        </button>
        <button
          onClick={() => {
            setView("month");
            setSelectedDate(todayString);
          }}
          style={{
            padding: isMobile ? "6px 12px" : "8px 16px",
            fontSize: isMobile ? "12px" : "14px",
            background: view === "month" ? "#4B6859" : "#e5e7eb",
            color: view === "month" ? "white" : "#111",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: view === "month" ? "bold" : "normal",
            transition: "all 0.2s",
            whiteSpace: "nowrap"
          }}
        >
          Month
        </button>

        {/* Date Input */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            const newValue = e.target.value;
            // If cleared (empty value), set to today
            setSelectedDate(newValue || todayString);
          }}
          style={{
            padding: isMobile ? "6px 8px" : "8px 12px",
            fontSize: isMobile ? "12px" : "14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            cursor: "pointer",
            marginLeft: "auto",
            background: "#fff",
            color: "#111",
            fontWeight: "normal",
            transition: "all 0.2s"
          }}
        />
      </div>

      {loading && (
        <div style={{
          textAlign: "center",
          padding: isMobile ? "40px 20px" : "60px 20px",
          fontSize: isMobile ? "14px" : "16px"
        }}>
          Loading...
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards - Responsive Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: isMobile ? "12px" : "20px",
            marginBottom: "24px"
          }}>
            <div
              style={{
                background: "#f5f1eb",
                padding: isMobile ? "16px" : "20px",
                borderRadius: "8px",
                borderLeft: "4px solid #B28C6A",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ 
                fontSize: isMobile ? "12px" : "14px", 
                color: "#666", 
                marginBottom: "8px" 
              }}>
                Inventory (On Hand)
              </div>
              <div style={{ 
                fontSize: isMobile ? "24px" : "32px", 
                fontWeight: "bold", 
                color: "#B28C6A" 
              }}>
                {onHand}
              </div>
            </div>

            <div
              style={{
                background: "#eef5f0",
                padding: isMobile ? "16px" : "20px",
                borderRadius: "8px",
                borderLeft: "4px solid #396245",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ 
                fontSize: isMobile ? "12px" : "14px", 
                color: "#666", 
                marginBottom: "8px" 
              }}>
                Total Incoming
              </div>
              <div style={{ 
                fontSize: isMobile ? "24px" : "32px", 
                fontWeight: "bold", 
                color: "#396245" 
              }}>
                {totalIncoming}
              </div>
            </div>

            <div
              style={{
                background: "#f5ebe9",
                padding: isMobile ? "16px" : "20px",
                borderRadius: "8px",
                borderLeft: "4px solid #8D2222",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ 
                fontSize: isMobile ? "12px" : "14px", 
                color: "#666", 
                marginBottom: "8px" 
              }}>
                Total Outgoing
              </div>
              <div style={{ 
                fontSize: isMobile ? "24px" : "32px", 
                fontWeight: "bold", 
                color: "#8D2222" 
              }}>
                {totalOutgoing}
              </div>
            </div>

            <div
              style={{
                background: "#fef3c7",
                padding: isMobile ? "16px" : "20px",
                borderRadius: "8px",
                borderLeft: "4px solid #f59e0b",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{
                fontSize: isMobile ? "12px" : "14px",
                color: "#666",
                marginBottom: "8px"
              }}>
                Net Movement
              </div>
              <div style={{
                fontSize: isMobile ? "24px" : "32px",
                fontWeight: "bold",
                color: "#f59e0b"
              }}>
                {totalIncoming - totalOutgoing}
              </div>
            </div>
          </div>

          {/* Charts - Responsive Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "repeat(2, 1fr)",
            gap: isMobile ? "16px" : "24px",
            marginBottom: "24px"
          }}>
            {/* Bar Chart */}
            <div
              style={{
                background: "white",
                padding: isMobile ? "12px" : "20px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                minHeight: isMobile ? "300px" : "400px"
              }}
            >
              <h3 style={{
                marginTop: 0,
                marginBottom: isMobile ? "12px" : "16px",
                fontSize: isMobile ? "16px" : "18px"
              }}>
                {view === "week" ? "Weekly Movement" : view === "month" ? "Monthly Movement" : "Daily Movement"}
              </h3>
              <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
                <BarChart data={chartData} margin={{ top: 5, right: isMobile ? 5 : 30, left: isMobile ? 0 : 0, bottom: isMobile ? 60 : 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={isMobile ? 80 : 100}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      fontSize: isMobile ? "12px" : "14px"
                    }}
                  />
                  {!isMobile && <Legend />}
                  <Bar dataKey="incoming" fill="#396245" name="Incoming" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outgoing" fill="#8D2222" name="Outgoing" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Destination Pie Chart */}
            <div
              style={{
                background: "white",
                padding: isMobile ? "12px" : "20px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                minHeight: isMobile ? "300px" : "400px"
              }}
            >
              <h3 style={{
                marginTop: 0,
                marginBottom: isMobile ? "12px" : "16px",
                fontSize: isMobile ? "16px" : "18px"
              }}>
                Outgoing by Ranch
              </h3>
              {formatDestinationData().length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
                    <PieChart>
                      <Pie
                        data={formatDestinationData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={isMobile ? false : ({ name, value }) => `${name}: ${value}`}
                        outerRadius={isMobile ? 60 : 100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {formatDestinationData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          fontSize: isMobile ? "12px" : "14px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {isMobile && (
                    <div style={{ fontSize: "12px", marginTop: "12px" }}>
                      {formatDestinationData().map((item, idx) => (
                        <div key={idx} style={{ marginBottom: "4px" }}>
                          <span style={{ display: "inline-block", width: "12px", height: "12px", background: COLORS[idx % COLORS.length], marginRight: "6px", borderRadius: "2px" }}></span>
                          {item.name}: {item.value}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#999",
                  fontSize: "14px"
                }}>
                  No outgoing data for this period
                </div>
              )}
            </div>
          </div>

          {/* Day Details Table - Responsive */}
          {view === "today" && dayDetails.length > 0 && (
            <div
              style={{
                background: "white",
                padding: isMobile ? "12px" : "20px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                overflowX: "auto"
              }}
            >
              <h3 style={{
                marginTop: 0,
                marginBottom: isMobile ? "12px" : "16px",
                fontSize: isMobile ? "16px" : "18px"
              }}>
                Movements: {selectedDate}
              </h3>

              {isMobile ? (
                // Mobile Card View
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {dayDetails.map((movement, index) => (
                    <div
                      key={index}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        padding: "12px",
                        background: "#f9fafb"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#666" }}>
                          {new Date(movement.movement_time).toLocaleTimeString()}
                        </span>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            background: movement.action === "incoming" ? "#eef5f0" : "#f5ebe9",
                            color: movement.action === "incoming" ? "#396245" : "#8D2222",
                            fontWeight: "500",
                            fontSize: "12px"
                          }}
                        >
                          {movement.action === "incoming" ? "Incoming" : "Outgoing"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                        <div><strong>Qty:</strong> {movement.quantity}</div>
                        <div><strong>Ranch:</strong> {movement.destination ? `${movement.destination}` : "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Desktop Table View
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "14px"
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                      <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Time</th>
                      <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Action</th>
                      <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Quantity</th>
                      <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Destination</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayDetails.map((movement, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #e5e7eb", transition: "background 0.2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                      >
                        <td style={{ padding: "12px" }}>{new Date(movement.movement_time).toLocaleTimeString()}</td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              background: movement.action === "incoming" ? "#eef5f0" : "#f5ebe9",
                              color: movement.action === "incoming" ? "#396245" : "#8D2222",
                              fontWeight: "500",
                              fontSize: "12px"
                            }}
                          >
                            {movement.action === "incoming" ? "Incoming" : "Outgoing"}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>{movement.quantity}</td>
                        <td style={{ padding: "12px" }}>{movement.destination ? `Ranch ${movement.destination}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "today" && dayDetails.length === 0 && (
            <div
              style={{
                background: "white",
                padding: isMobile ? "20px" : "40px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                textAlign: "center",
                color: "#666"
              }}
            >
              No movements recorded for {selectedDate}
            </div>
          )}
        </>
      )}
    </div>
  );
}
