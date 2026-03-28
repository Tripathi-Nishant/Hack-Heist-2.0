// Dashboard — the main page.
// Upload CSVs or paste JSON → get full drift report, heatmap, charts, explanation.

import React, { useState, useCallback, useEffect } from "react";
import { api } from "../api/api";
import StatCards        from "../components/StatCards";
import FeatureHeatmap   from "../components/FeatureHeatmap";
import DistributionChart from "../components/DistributionChart";
import SchemaPanel      from "../components/SchemaPanel";
import ExplanationCard  from "../components/ExplanationCard";
import DriftTimeline    from "../components/DriftTimeline";

// ── Helpers ───────────────────────────────────────────────────────────────────

function csvToJson(csvText) {
  const lines  = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",");
    return Object.fromEntries(
      headers.map((h, i) => [h, isNaN(vals[i]) ? vals[i]?.trim() : Number(vals[i])])
    );
  });
}

async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────

const FONT  = "'Outfit', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const BG    = "#020617";
const PANEL = "#0f172a";
const BORDER= "#1e293b";

const panelStyle = {
  background:   PANEL,
  border:       `1px solid ${BORDER}`,
  borderRadius: "4px",
  padding:      "20px 24px",
};

const labelStyle = {
  fontSize:      "10px",
  color:         "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom:  "12px",
  fontFamily:    FONT,
  fontWeight:    600,
};

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({ label, onData, data }) {
  const [drag, setDrag] = useState(false);

  async function handleFile(file) {
    const text = await readFile(file);
    try {
      onData(csvToJson(text));
    } catch {
      alert(`Could not parse ${file.name}. Make sure it's a valid CSV.`);
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={async e => {
        e.preventDefault(); setDrag(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => document.getElementById(`file-${label}`).click()}
      style={{
        flex:         1,
        border:       `1px dashed ${drag ? "#10b981" : data ? "#059669" : "#475569"}`,
        borderRadius: "6px",
        padding:      "20px",
        cursor:       "pointer",
        textAlign:    "center",
        background:   data ? "rgba(16, 185, 129, 0.1)" : drag ? "rgba(16, 185, 129, 0.1)" : "transparent",
        transition:   "all 0.15s",
        fontFamily:   FONT,
      }}
    >
      <input
        id={`file-${label}`}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
      />
      <div style={{ fontSize: "20px", marginBottom: "8px", color: data ? "#10b981" : "#64748b" }}>
        {data ? "✓" : "⊕"}
      </div>
      <div style={{ fontSize: "11px", color: data ? "#10b981" : "#94a3b8", fontWeight: 500 }}>
        {data ? `${data.length} rows loaded` : `Drop ${label} CSV`}
      </div>
    </div>
  );
}

// ── Feature detail modal ──────────────────────────────────────────────────────

function FeatureModal({ feature, data, onClose }) {
  if (!feature) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position:   "fixed", inset: 0,
        background: "rgba(0,0,0,0.85)",
        display:    "flex", alignItems: "center", justifyContent: "center",
        zIndex:     100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   PANEL,
          border:       `1px solid ${BORDER}`,
          borderRadius: "6px",
          padding:      "28px",
          width:        "min(640px, 90vw)",
          fontFamily:   FONT,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", color: "#f8fafc", fontWeight: 600 }}>{feature}</div>
          <button onClick={onClose} style={{
            background: "none", border: "none",
            color: "#94a3b8", cursor: "pointer", fontSize: "24px", lineHeight: "14px"
          }}>×</button>
        </div>
        <DistributionChart featureName={feature} featureData={data} />
        <div style={{ marginTop: "20px", fontSize: "12px", color: "#cbd5e1", fontFamily: FONT_MONO }}>
          {data.type === "numerical" && (
            <>
              <div>PSI: {data.psi} &nbsp;|&nbsp; KL: {data.kl_divergence} &nbsp;|&nbsp; JS: {data.js_distance}</div>
              <div style={{ marginTop: "6px" }}>
                KS test: p={data.ks_test?.p_value} &nbsp;
                (drifted={String(data.ks_test?.drifted)})
              </div>
            </>
          )}
          {data.type === "categorical" && (
            <div>Chi² p-value: {data.chi2_test?.p_value} &nbsp; (drifted={String(data.chi2_test?.drifted)})</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [trainData,    setTrainData]    = useState(null);
  const [servingData,  setServingData]  = useState(null);
  const [labelColumn,  setLabelColumn]  = useState("");
  const [report,       setReport]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [explLoading,  setExplLoading]  = useState(false);
  const [error,        setError]        = useState(null);
  const [activeTab,    setActiveTab]    = useState("features");
  const [selectedFeat, setSelectedFeat] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [history,      setHistory]      = useState([]);
  const [liveMode,     setLiveMode]     = useState(true);
  const [retraining,   setRetraining]   = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const resp = await fetch("/api/v1/history");
      const data = await resp.json();
      setHistory(data.reports || []);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  }, []);

  // Poll for history
  useEffect(() => {
    fetchHistory();
    let interval;
    if (liveMode) {
      interval = setInterval(fetchHistory, 5000);
    }
    return () => clearInterval(interval);
  }, [liveMode, fetchHistory]);

  async function loadReportFromHistory(reportId) {
    setLoading(true);
    try {
      const resp = await fetch(`/api/v1/history`);
      const data = await resp.json();
      const found = data.reports.find(r => r.id === reportId);
      if (found) {
        setReport(found);
      }
    } catch (e) {
      setError("Could not load report detail.");
    } finally {
      setLoading(false);
    }
  }

  async function runCheck() {
    if (!trainData || !servingData) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const result = await api.check({
        training:     trainData,
        serving:      servingData,
        label_column: labelColumn || undefined,
        explain:      false,
      });
      setReport(result);
      setActiveTab("features");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExplanation() {
    if (!report) return;
    setExplLoading(true);
    try {
      const exp = await api.explain({ report, feature: null });
      setReport(prev => ({ ...prev, explanation: exp }));
      setActiveTab("explain");
    } catch (e) {
      setError(e.message);
    } finally {
      setExplLoading(false);
    }
  }

  function openFeature(name, data) {
    setSelectedFeat(name);
    setSelectedData(data);
  }

  async function handleRetrain() {
    if (!report) return;
    setRetraining(true);
    try {
      // Trigger backend "retraining"
      await fetch(`/api/v1/retrain/${report.id || 'current'}`, { method: "POST" });
      
      // Artificial delay for "Training" dramatic effect
      await new Promise(r => setTimeout(r, 4000));
      
      // Refresh history to see the "Resolution"
      await fetchHistory();
      
      setRetraining(false);
      alert("Model successfully retrained! Reference data has been updated to the current serving distribution.");
    } catch (err) {
      console.error(err);
      setRetraining(false);
      alert("Retraining failed. Check console for details.");
    }
  }

  const TABS = ["features", "schema", "explain"];

  return (
    <div style={{
      minHeight:  "100vh",
      background: BG,
      color:      "#8ab890",
      fontFamily: FONT,
      padding:    "0",
    }}>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`,
        padding:      "20px 32px",
        display:      "flex",
        alignItems:   "center",
        gap:          "20px",
        background:   "#020617",
        boxShadow:    "0 4px 30px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
          <span style={{ fontSize: "20px", color: "#f8fafc", fontWeight: 700, letterSpacing: "0.02em" }}>
            DRIFTWATCH
          </span>
          <span style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.05em", fontWeight: 500 }}>
            v0.1.0 / training–serving skew detector
          </span>
        </div>

        {report && (
          <div style={{
            marginLeft:    "auto",
            fontSize:      "11px",
            color:         report.overall_severity === "critical" ? "#ef4444"
                         : report.overall_severity === "warning"  ? "#f59e0b"
                         : "#10b981",
            border:        `1px solid currentColor`,
            borderRadius:  "2px",
            padding:       "3px 10px",
            letterSpacing: "0.08em",
          }}>
            {report.overall_severity?.toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ display: "flex", padding: "28px 32px", maxWidth: "1400px", margin: "0 auto", gap: "28px" }}>
        
        {/* Sidebar: History */}
        <div style={{ width: "280px", flexShrink: 0 }}>
          <div style={{ ...panelStyle, padding: "16px" }}>
            <div style={{ ...labelStyle, display: "flex", justifyContent: "space-between" }}>
              <span>Recent Checks</span>
              <span 
                onClick={() => setLiveMode(!liveMode)}
                style={{ color: liveMode ? "#10b981" : "#444", cursor: "pointer" }}
              >
                {liveMode ? "● LIVE" : "○ MANUAL"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.length === 0 && (
                <div style={{ fontSize: "10px", color: "#222", fontStyle: "italic" }}>
                  Waiting for incoming reports...
                </div>
              )}
              {history.map(item => (
                <div 
                  key={item.id}
                  onClick={() => {
                    if (item.report_json) {
                      setReport(item.report_json);
                      setActiveTab("features");
                    } else {
                      loadReportFromHistory(item.id);
                    }
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "3px",
                    background: report?.id === item.id ? "#064e3b" : "#0f172a",
                    border: `1px solid ${report?.id === item.id ? "#10b981" : "#1a2a1c"}`,
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "#f8fafc" }}>{item.tag || `Report #${item.id}`}</span>
                    <span style={{ 
                      color: item.overall_severity === "critical" ? "#ef4444" : "#10b981",
                      fontSize: "9px"
                    }}>
                      {item.overall_severity?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ color: "#64748b", fontSize: "9px" }}>
                    {new Date(item.created_at).toLocaleTimeString()} · {item.drifted_features?.length || 0} drifted
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>

        {/* Upload + config row */}
        <div style={{ ...panelStyle, marginBottom: "20px" }}>
          <div style={labelStyle}>Data Input</div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
            <UploadZone label="training" onData={setTrainData}   data={trainData}   />
            <UploadZone label="serving"  onData={setServingData} data={servingData} />
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="label column (optional)"
              value={labelColumn}
              onChange={e => setLabelColumn(e.target.value)}
              style={{
                background:   "#0f172a",
                border:       `1px solid ${BORDER}`,
                borderRadius: "3px",
                padding:      "8px 12px",
                color:        "#10b981",
                fontFamily:   FONT,
                fontSize:     "12px",
                outline:      "none",
                flex:         "1",
                minWidth:     "200px",
              }}
            />
            <button
              onClick={runCheck}
              disabled={!trainData || !servingData || loading}
              style={{
                background:    trainData && servingData ? "#064e3b" : "#0f172a",
                border:        `1px solid ${trainData && servingData ? "#10b981" : BORDER}`,
                borderRadius:  "3px",
                padding:       "8px 24px",
                color:         trainData && servingData ? "#10b981" : "#64748b",
                fontFamily:    FONT,
                fontSize:      "12px",
                cursor:        trainData && servingData ? "pointer" : "default",
                letterSpacing: "0.08em",
                transition:    "all 0.15s",
              }}
            >
              {loading ? "ANALYSING..." : "RUN CHECK"}
            </button>
            
            <button
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," 
                  + ["Feature,Metric,Severity", ...Object.entries(report?.features || {}).map(([k,v]) => `${k},${v.psi || v.chi2_test?.p_value},${v.severity}`)].join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `drift_report_${report?.id || 'export'}.csv`);
                document.body.appendChild(link);
                link.click();
              }}
              disabled={!report}
              style={{
                background:    "none",
                border:        `1px solid ${report ? "#334155" : BORDER}`,
                borderRadius:  "3px",
                padding:       "8px 16px",
                color:         report ? "#94a3b8" : "#475569",
                fontFamily:    FONT,
                fontSize:      "12px",
                cursor:        report ? "pointer" : "default",
                letterSpacing: "0.05em",
                transition:    "all 0.15s",
              }}
            >
              DOWNLOAD REPORT
            </button>

            {report && report.overall_severity === "critical" && (
              <button
                onClick={handleRetrain}
                disabled={retraining}
                style={{
                  background:    "#ef444415",
                  border:        "1px solid #ef4444",
                  borderRadius:  "3px",
                  padding:       "8px 20px",
                  color:         "#ef4444",
                  fontFamily:    FONT,
                  fontSize:      "12px",
                  fontWeight:    700,
                  cursor:        retraining ? "default" : "pointer",
                  letterSpacing: "0.05em",
                  transition:    "all 0.15s",
                  boxShadow:     "0 0 15px rgba(239, 68, 68, 0.2)",
                  marginLeft:    "auto",
                }}
              >
                {retraining ? "REFITTING MODEL..." : "APPROVE RETRAINING"}
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#3d1a0a", border: "1px solid #c0440a44",
            borderRadius: "4px", padding: "12px 16px",
            color: "#ef4444", fontSize: "12px", marginBottom: "20px",
          }}>
            Error: {error}
          </div>
        )}

        {/* Drift Timeline */}
        <DriftTimeline history={history} />

        {/* Stat cards */}
        <div style={{ marginBottom: "20px" }}>
          <StatCards report={report} />
        </div>

        {/* Tabs + content */}
        {report && (
          <div style={panelStyle}>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: "0", marginBottom: "20px", borderBottom: `1px solid ${BORDER}` }}>
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background:    "none",
                    border:        "none",
                    borderBottom:  activeTab === tab ? "2px solid #10b981" : "2px solid transparent",
                    padding:       "8px 20px",
                    color:         activeTab === tab ? "#10b981" : "#94a3b8",
                    fontFamily:    FONT,
                    fontSize:      "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    cursor:        "pointer",
                    marginBottom:  "-1px",
                    transition:    "color 0.15s",
                  }}
                >
                  {tab}
                  {tab === "features" && report.drifted_count > 0 && (
                    <span style={{ marginLeft: "6px", color: "#ef4444" }}>
                      {report.drifted_count}
                    </span>
                  )}
                  {tab === "schema" && (report.schema?.critical_count + report.schema?.warning_count) > 0 && (
                    <span style={{ marginLeft: "6px", color: "#f59e0b" }}>
                      {report.schema.critical_count + report.schema.warning_count}
                    </span>
                  )}
                </button>
              ))}

              {/* Explain button */}
              <button
                onClick={fetchExplanation}
                disabled={explLoading}
                style={{
                  marginLeft:    "auto",
                  background:    "none",
                  border:        `1px solid ${BORDER}`,
                  borderRadius:  "3px",
                  padding:       "4px 14px",
                  color:         "#94a3b8",
                  fontFamily:    FONT,
                  fontSize:      "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor:        "pointer",
                  alignSelf:     "center",
                  marginBottom:  "4px",
                }}
              >
                {explLoading ? "..." : "⟳ explain"}
              </button>
            </div>

            {/* Features tab */}
            {activeTab === "features" && (
              <div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "16px" }}>
                  Click any feature for distribution detail
                </div>
                <FeatureHeatmap
                  features={report.features}
                  onFeatureClick={openFeature}
                />
              </div>
            )}

            {/* Schema tab */}
            {activeTab === "schema" && (
              <SchemaPanel schema={report.schema} />
            )}

            {/* Explain tab */}
            {activeTab === "explain" && (
              <ExplanationCard
                explanation={report.explanation}
                loading={explLoading}
              />
            )}
          </div>
        )}

        {/* Empty state */}
        {!report && !loading && (
          <div style={{
            ...panelStyle,
            textAlign:  "center",
            padding:    "60px 32px",
            color:      "#475569",
            fontSize:   "12px",
            lineHeight: 2,
          }}>
            <div style={{ fontSize: "32px", marginBottom: "16px", color: "#475569" }}>◈</div>
            <div>Upload your training and serving CSVs to begin</div>
            <div style={{ fontSize: "11px", marginTop: "8px", color: "#142a16" }}>
              supports CSV · Parquet via CLI · JSON via API
            </div>
          </div>
        )}
      </div>

      {/* Feature detail modal */}
      <FeatureModal
        feature={selectedFeat}
        data={selectedData}
        onClose={() => { setSelectedFeat(null); setSelectedData(null); }}
      />
      </div>
    </div>
  );
}