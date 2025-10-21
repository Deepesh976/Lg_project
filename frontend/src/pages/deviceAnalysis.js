// src/components/DeviceAnalysis.jsx
import React, { useEffect, useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import axios from "axios";
import Select from "react-select";
import "../styles/admin.css";

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
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  return (
    <div className="card" style={{ padding: 16, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {role}
            <span style={{ fontSize: 12, color: "#6b7280" }}>{machineIdVal !== "—" ? machineIdVal : ""}</span>
            {pick(["status"], null) && <StatusBadge status={pick(["status"])} />}
          </h4>
        </div>
      </div>

      <div style={gridStyle}>
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

  const ufNode = getRoleNode("UF");
  const ufMetrics = ufNode?.metrics ?? null;

  // TDS value for gauge: prefer scalar, else last value of array / flowRate etc.
  const tdsGaugeValue = useMemo(() => {
    if (!ufMetrics) return 0;
    if (typeof ufMetrics.tds === "number") return ufMetrics.tds;
    if (typeof ufMetrics.tds === "string" && !Number.isNaN(Number(ufMetrics.tds))) return Number(ufMetrics.tds);
    if (Array.isArray(ufMetrics.tds) && ufMetrics.tds.length) {
      const last = ufMetrics.tds[ufMetrics.tds.length - 1];
      return (last && last.value != null) ? Number(last.value) : 0;
    }
    // fallback: check flowRate points for a tds-like field
    if (Array.isArray(ufMetrics.flowRate) && ufMetrics.flowRate.length) {
      const last = ufMetrics.flowRate[ufMetrics.flowRate.length - 1];
      if (last && (last.tds != null || last.value != null)) return Number(last.tds ?? last.value);
    }
    return 0;
  }, [ufMetrics]);

  // Flow line data (modern style)
  const flowLinePoints = useMemo(() => {
    if (!ufMetrics) return [];
    if (Array.isArray(ufMetrics.flowRate) && ufMetrics.flowRate.length) {
      // return objects with time label and value
      return ufMetrics.flowRate.map((p, i) => {
        if (typeof p === "object") {
          const value = Number(p.value ?? p.flow ?? 0) || 0;
          const label = p.time ?? p.ts ?? p.timestamp ?? `P ${i + 1}`;
          return { label, value };
        }
        return { label: `P ${i + 1}`, value: Number(p) || 0 };
      });
    }
    if (typeof ufMetrics.flowRate === "number") return [{ label: "Now", value: ufMetrics.flowRate }];
    return [];
  }, [ufMetrics]);

  // Modern gauge option for TDS
  const makeTdsGaugeOption = (value) => {
    const max = Math.max(200, Math.ceil(value / 10) * 10 + 20); // adaptive max, but >=200
    return {
      tooltip: { formatter: "{a} <br/>{b} : {c} ppm" },
      series: [
        {
          name: "TDS",
          type: "gauge",
          radius: "90%",
          min: 0,
          max,
          splitNumber: 8,
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.25, "#10b981"],
                [0.6, "#f59e0b"],
                [1, "#ef4444"],
              ],
            },
          },
          axisTick: { length: 8, lineStyle: { color: "auto" } },
          splitLine: { length: 16, lineStyle: { color: "auto" } },
          axisLabel: { color: "#6b7280" },
          pointer: { width: 6, itemStyle: { color: "#111827" } },
          detail: {
            formatter: "{value} ppm",
            fontSize: 14,
            color: "#111827",
            offsetCenter: [0, "60%"],
          },
          data: [{ value: Math.round(value), name: "TDS" }],
          title: { fontSize: 12, color: "#6b7280" },
        },
      ],
    };
  };

  // Modern line option for Flow Rate
  const makeModernFlowLineOption = (points, title) => {
    const data = points.map((p) => p.value);
    const labels = points.map((p) => {
      try {
        const parsed = parseDateTime(p.label);
        return parsed ? parsed.toLocaleTimeString() : String(p.label);
      } catch {
        return String(p.label);
      }
    });

    return {
      title: { text: title, textStyle: { fontSize: 12, color: "#6b7280" } },
      tooltip: { trigger: "axis", formatter: (params) => {
        if (!params || !params.length) return "";
        const p = params[0];
        return `${p.axisValue}<br/>Flow: ${p.data} L/min`;
      }},
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: "category",
        data: labels.length ? labels : ["Point 1"],
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        splitLine: { lineStyle: { type: "dashed", color: "#f3f4f6" } },
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          data: data.length ? data : [0],
          type: "line",
          smooth: true,
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59,130,246,0.18)" },
                { offset: 1, color: "rgba(59,130,246,0)" },
              ],
            },
          },
          lineStyle: { width: 3, color: "#3b82f6" },
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "#3b82f6" },
        },
      ],
    };
  };

  const atw1 = getRoleNode("ATW1");
  const atw2 = getRoleNode("ATW2");
  const atw3 = getRoleNode("ATW3");

  return (
    <div className="page-shell">
      <div className="container-narrow">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: 20 }}>
          <h1 style={{ margin: 0, textAlign: "center", color: "#1f2937" }}>Device Analysis Dashboard</h1>

          <div style={{ position: "absolute", right: 0, top: 0, minWidth: 320 }}>
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
                }),
                menu: (base) => ({ ...base, zIndex: 9999 }),
              }}
              noOptionsMessage={() => (loadingSetups ? "Loading..." : "No setups found")}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, color: "#b91c1c", background: "#fee2e2", padding: 12, borderRadius: 8, border: "1px solid #fca5a5" }}>
            {error}
          </div>
        )}

        {/* UF Section now: Gauge (TDS) + Modern Flow Line + Pulse Count */}
        <div className="card" style={{ padding: 20, marginBottom: 16, border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "#1f2937", fontSize: 18 }}>UF (Ultrafiltration System)</h3>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {loadingMetrics ? "Loading..." : ufMetrics?.recordedAt ? formatToLocalString(ufMetrics.recordedAt) : "No data"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            {/* TDS Gauge */}
            <div style={{ flex: "0 0 260px", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ReactECharts option={makeTdsGaugeOption(tdsGaugeValue)} style={{ height: 220, width: "100%" }} />
            </div>

            {/* Flow modern line */}
            <div style={{ flex: "1 1 420px", minHeight: 200 }}>
              <ReactECharts option={makeModernFlowLineOption(flowLinePoints, "Flow Rate (L/min)")} style={{ height: 240, width: "100%" }} />
            </div>

            {/* Pulse Count */}
            <div style={{ minWidth: 160, display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#f8f9fa", borderRadius: 8, border: "2px solid #e5e7eb" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Pulse Count</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#1f2937", textAlign: "center" }}>{loadingMetrics ? "—" : ufMetrics?.pulseCount ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* ATW Systems */}
        <div style={{ marginTop: 8 }}>
          <h3 style={{ marginBottom: 16, color: "#1f2937" }}>ATW Systems (Automatic Water Dispensers)</h3>
          <AtwCard role="ATW1" node={atw1} loading={loadingMetrics} />
          <AtwCard role="ATW2" node={atw2} loading={loadingMetrics} />
          <AtwCard role="ATW3" node={atw3} loading={loadingMetrics} />
        </div>
      </div>
    </div>
  );
};

export default DeviceAnalysis;
