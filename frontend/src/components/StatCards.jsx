// StatCards — the four header metric cards at the top of the dashboard.

import React from "react";

const SEV_STYLES = {
  critical: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)", glow: "rgba(239, 68, 68, 0.2)" },
  warning:  { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)", glow: "rgba(245, 158, 11, 0.2)" },
  stable:   { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)", glow: "rgba(16, 185, 129, 0.2)" },
};

function Card({ label, value, sub, severity }) {
  const s = SEV_STYLES[severity] || SEV_STYLES.stable;
  return (
    <div style={{
      background:   s.bg,
      border:       `1px solid ${s.border}`,
      borderRadius: "4px",
      padding:      "16px 20px",
      flex:         1,
      minWidth:     "140px",
      boxShadow:    `0 0 20px ${s.glow}`,
    }}>
      <div style={{
        fontSize:      "9px",
        color:         s.color + "99",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        marginBottom:  "8px",
        fontFamily:    "'Outfit', sans-serif",
        fontWeight:    600,
      }}>
        {label}
      </div>
      <div style={{
        fontSize:   "28px",
        color:      s.color,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        lineHeight: 1,
        marginBottom: "4px",
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize:   "11px",
          color:      "#cbd5e1",
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 500,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function StatCards({ report }) {
  if (!report) {
    return (
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {["Overall Status", "Features Checked", "Drifted", "Schema Issues"].map(label => (
          <div key={label} style={{
            flex: 1, minWidth: "140px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "4px",
            padding: "16px 20px",
            height: "80px",
          }} />
        ))}
      </div>
    );
  }

  const {
    overall_severity,
    features_checked,
    drifted_count,
    schema,
    reference_rows,
    current_rows,
  } = report;

  const schemaIssues = (schema?.critical_count || 0) + (schema?.warning_count || 0);

  return (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      <Card
        label="Overall Status"
        value={overall_severity?.toUpperCase()}
        sub={`${reference_rows?.toLocaleString()} train / ${current_rows?.toLocaleString()} serving`}
        severity={overall_severity}
      />
      <Card
        label="Features Checked"
        value={features_checked}
        sub="total features analysed"
        severity="stable"
      />
      <Card
        label="Drifted"
        value={`${drifted_count} / ${features_checked}`}
        sub={drifted_count === 0 ? "all stable" : "need attention"}
        severity={drifted_count === 0 ? "stable" : drifted_count > features_checked / 2 ? "critical" : "warning"}
      />
      <Card
        label="Schema Issues"
        value={schemaIssues}
        sub={`${schema?.critical_count || 0} critical · ${schema?.warning_count || 0} warning`}
        severity={schema?.overall_severity || "stable"}
      />
    </div>
  );
}