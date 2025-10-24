// src/pages/deviceAnalysis.js
import React, { useEffect, useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import axios from "axios";
import Select from "react-select";
import "../styles/pages.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:5000";

/* ---------- Utility: robust date/time parser & formatter ---------- */
const parseDateTime = (v) => {
  if (v == null) return null;
  if (v instanceof Date) {
    if (isNaN(v)) return null;
    return v;
  }
  if (typeof v === "number") {
    const ms = v > 1e12 ? v : v * 1000;
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    if (/\d{4}-\d{2}-\d{2}T/.test(s)) {
      const d = new Date(s);
      return isNaN(d) ? null : d;
    }
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) {
      const isoLocal = s.replace(/\s+/, "T");
      const d = new Date(isoLocal);
      return isNaN(d) ? null : d;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(`${s}T00:00:00`);
      return isNaN(d) ? null : d;
    }
    if (/^\d{10}$/.test(s)) {
      const ms = Number(s) * 1000;
      const d = new Date(ms);
      return isNaN(d) ? null : d;
    }
    if (/^\d{13}$/.test(s)) {
      const d = new Date(Number(s));
      return isNaN(d) ? null : d;
    }
    const df = new Date(s);
    return isNaN(df) ? null : df;
  }
  return null;
};

const formatToLocalString = (v) => {
  const d = parseDateTime(v);
  if (!d) return "—";
  try {
    return d.toLocaleString();
  } catch {
    return d.toString();
  }
};

/* ---------- Small UI pieces ---------- */
const MetricBlock = ({ label, value, unit = "" }) => (
  <div
    style={{
      minWidth: 120,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      padding: "8px 12px",
      background: "#f8f9fa",
      borderRadius: 6,
      border: "1px solid #e5e7eb",
    }}
  >
    <div style={{ fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
      {value}
      {unit}
    </div>
    <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  if (status === undefined || status === null) return null;
  const isActive = String(status).toUpperCase() === "ACTIVE";
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: isActive ? "#dcfce7" : "#fee2e2",
        color: isActive ? "#166534" : "#dc2626",
      }}
    >
      {String(status)}
    </span>
  );
};

/* ---------- ATW Card ---------- */
const AtwCard = ({ role, node, loading }) => {
  const metrics = (node && node.metrics) || node || {};
  const raw = (node && node.raw) || null;
  const meta = raw?.metadata || raw?.meta || {};

  const pick = (keys, fallback = "—") => {
    for (const k of keys) {
      if (k == null) continue;
      if (metrics && metrics[k] !== undefined && metrics[k] !== null) return metrics[k];
      if (raw && raw[k] !== undefined && raw[k] !== null) return raw[k];
      if (meta && meta[k] !== undefined && meta[k] !== null) return meta[k];
      if (typeof k === "string") {
        const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (metrics && metrics[camel] !== undefined && metrics[camel] !== null) return metrics[camel];
        if (raw && raw[camel] !== undefined && raw[camel] !== null) return raw[camel];
        if (meta && meta[camel] !== undefined && meta[camel] !== null) return meta[camel];
      }
    }
    return fallback;
  };

  const formatDateTime = (val) => formatToLocalString(val);

  const setupIdVal = pick(["setup_id", "setupId", "setup", "setupID", "setupid"], "—");
  const machineIdVal = pick(["machine_id", "deviceId", "deviceLabel", "machineId", "device_id", "_id"], "—");

  const fields = [
    { label: "setup_id", value: setupIdVal },
    { label: "machine_id", value: machineIdVal },
    { label: "status", value: pick(["status", "state", "additional_status"], "—") },
    { label: "water_dispensed", value: pick(["water_dispensed", "waterDispensed", "water_dispense", "water"], "—") },
    { label: "rfid_collected_amount", value: pick(["rfid_collected_amount", "rfidCollectedAmount", "rfid_amount", "rfidAmount"], "—") },
    { label: "rfid_swipe_count", value: pick(["rfid_swipe_count", "rfidSwipeCount", "swipeCount", "rfid_swipes"], "—") },
    { label: "amount_debited", value: pick(["amount_debited", "amountDebited", "debited_amount", "amount", "debit"], "—") },
    { label: "uid", value: pick(["uid", "userId", "cardUid", "rfid_uid"], "—") },
    { label: "coin_collected_amount", value: pick(["coin_collected_amount", "coinCollectedAmount", "coinAmount", "coins"], "—") },
    { label: "remaining_balance", value: pick(["remaining_balance", "remainingBalance", "balance", "remaining_bal"], "—") },
    { label: "user_card_activated", value: pick(["user_card_activated", "userCardActivated", "card_activated", "activated"], "—") },
    { label: "date_time", value: formatDateTime(pick(["date_time", "datetime", "date", "time", "timestamp", "recordedAt"], "—")) },
    { label: "additional_status", value: pick(["additional_status", "add_status", "extra_status"], "—") },
    { label: "last_seen", value: formatDateTime(pick(["last_seen", "lastSeen", "last_seen_at", "lastSeenAt", "seenAt", "ts", "recordedAt"], "—")) },
  ];

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    marginTop: 12,
  };

  const fieldBox = {
    background: "#f9fafc",
    border: "2px solid #e5e7eb",
    borderRadius: 8,
    padding: "12px 1rem",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    transition: "all 0.2s ease",
  };

  return (
    <div className="card-panel" style={{ padding: 0, overflow: "visible" }}>
      <div style={{ padding: "1rem 1.5rem", borderBottom: "2px solid #f0f2f5", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem", fontWeight: 700, color: "#1f2937" }}>
            <i className="fas fa-microchip" style={{ color: "#3f51b5" }}></i>
            {role}
            <span style={{ fontSize: 12, color: "#6b7280" }}>{machineIdVal !== "—" ? machineIdVal : ""}</span>
            {pick(["status"], null) && <StatusBadge status={pick(["status"])} />}
          </h4>
        </div>
      </div>

      <div style={{ ...gridStyle, padding: "1.5rem" }}>
        {fields.map((f) => (
          <div key={f.label} style={fieldBox}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{f.label.replace(/_/g, " ")}</div>
            <div style={{ fontSize: 14, color: "#111827", fontWeight: 600, wordBreak: "break-word" }}>{String(f.value ?? "—")}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Main DeviceAnalysis component ---------- */
const DeviceAnalysis = () => {
  const [setupOptions, setSetupOptions] = useState([]);
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [loadingSetups, setLoadingSetups] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [setupMetrics, setSetupMetrics] = useState(null);
  const [error, setError] = useState(null);

  // Fetch setup IDs
  useEffect(() => {
    const controller = new AbortController();
    const fetchSetups = async () => {
      setLoadingSetups(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE}/api/analysis/setups`, { signal: controller.signal });
        const list = Array.isArray(res.data) ? res.data : [];
        const options = list.map((item) =>
          typeof item === "string" || typeof item === "number"
            ? { label: String(item), value: String(item) }
            : { label: item.label || item.name || String(item.value || item._id || item.id || ""), value: item.value || item._id || item.id || item }
        );
        setSetupOptions(options);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Failed to load setups:", err);
          setError("Failed to load setup list.");
        }
      } finally {
        setLoadingSetups(false);
      }
    };

    fetchSetups();
    return () => controller.abort();
  }, []);

  // When a setup is selected, fetch grouped metrics
  useEffect(() => {
    if (!selectedSetup) {
      setSetupMetrics(null);
      return;
    }
    const controller = new AbortController();
    const fetchSetupMetrics = async () => {
      setLoadingMetrics(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE}/api/analysis/setup?setupId=${encodeURIComponent(selectedSetup.value)}`, { signal: controller.signal });
        setSetupMetrics(res.data);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Failed to load setup metrics:", err);
          setError("Failed to load metrics for this setup.");
          setSetupMetrics(null);
        }
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchSetupMetrics();
    return () => controller.abort();
  }, [selectedSetup]);

  const getRoleNode = (role) => {
    if (!setupMetrics || !setupMetrics.metrics) return null;
    const node = setupMetrics.metrics[role];
    if (!node) return null;
    if (node.metrics || node.raw) return node;
    return { metrics: node, raw: null };
  };

  const atw1 = getRoleNode("ATW1");
  const atw2 = getRoleNode("ATW2");
  const atw3 = getRoleNode("ATW3");

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="card-panel" style={{ padding: 0 }}>
          <div className="page-header" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", padding: "1.5rem" }}>
            <div>
              <h1 className="page-title">Device Analysis Dashboard</h1>
            </div>

            <div style={{ minWidth: 320 }}>
              <Select
                options={setupOptions}
                value={selectedSetup}
                onChange={(val) => {
                  setSelectedSetup(val);
                }}
                placeholder={loadingSetups ? "Loading setup IDs..." : "Select Setup ID..."}
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: 40,
                    borderRadius: 8,
                    border: "2px solid #e5e7eb",
                    boxShadow: "none",
                    fontFamily: "inherit",
                  }),
                  menu: (base) => ({ ...base, zIndex: 9999 }),
                }}
                noOptionsMessage={() => (loadingSetups ? "Loading..." : "No setups found")}
              />
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ margin: "1rem" }}>
              {error}
            </div>
          )}

          <div style={{ padding: "1.5rem", borderTop: "2px solid #f0f2f5" }}>
            <h3 style={{ marginBottom: 16, color: "#1f2937", fontSize: "1.25rem", fontWeight: 700 }}>
              <i className="fas fa-water"></i> ATW Systems (Automatic Water Dispensers)
            </h3>
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <AtwCard role="ATW1" node={atw1} loading={loadingMetrics} />
              <AtwCard role="ATW2" node={atw2} loading={loadingMetrics} />
              <AtwCard role="ATW3" node={atw3} loading={loadingMetrics} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceAnalysis;
