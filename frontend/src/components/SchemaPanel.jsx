// SchemaPanel — displays schema drift issues in a clean list.

import React from "react";

const ISSUE_ICONS = {
  missing_column:    "⬡",
  extra_column:      "⬢",
  type_change:       "⟳",
  null_rate_increase:"↑",
  unseen_categories: "?",
};

const SEV = {
  critical: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)" },
  warning:  { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
  stable:   { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)" },
};

export default function SchemaPanel({ schema }) {
  if (!schema) return null;

  const { has_drift, critical_count, warning_count, issues = [] } = schema;

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* Summary bar */}
      <div style={{
        display:       "flex",
        gap:           "20px",
        marginBottom:  "16px",
        fontSize:      "12px",
      }}>
        <span style={{ color: has_drift ? "#ef4444" : "#10b981" }}>
          {has_drift ? "schema issues detected" : "schema ok"}
        </span>
        {critical_count > 0 && (
          <span style={{ color: "#ef4444" }}>{critical_count} critical</span>
        )}
        {warning_count > 0 && (
          <span style={{ color: "#f59e0b" }}>{warning_count} warning</span>
        )}
      </div>

      {/* Issue list */}
      {issues.length === 0 ? (
        <div style={{
          padding:      "20px",
          textAlign:    "center",
          color:        "#94a3b8",
          fontSize:     "12px",
          border:       "1px solid #1e293b",
          borderRadius: "4px",
        }}>
          No schema issues detected
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {issues.map((issue, i) => {
            const s = SEV[issue.severity] || SEV.warning;
            const icon = ISSUE_ICONS[issue.issue] || "!";
            return (
              <div key={i} style={{
                background:   s.bg,
                border:       `1px solid ${s.border}`,
                borderRadius: "3px",
                padding:      "10px 14px",
                display:      "flex",
                gap:          "12px",
                alignItems:   "flex-start",
              }}>
                {/* icon + type */}
                <div style={{
                  color:      s.color,
                  fontSize:   "16px",
                  lineHeight: 1,
                  minWidth:   "16px",
                  marginTop:  "1px",
                }}>
                  {icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize:      "10px",
                    color:         s.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom:  "4px",
                    fontWeight:    700,
                  }}>
                    {issue.issue.replace(/_/g, " ")} — {issue.column}
                  </div>
                  <div style={{
                    fontSize:   "12px",
                    color:      "#cbd5e1",
                    lineHeight: 1.5,
                  }}>
                    {issue.detail}
                  </div>
                </div>
                {/* severity badge */}
                <div style={{
                  fontSize:      "9px",
                  color:         s.color,
                  border:        `1px solid ${s.color}44`,
                  borderRadius:  "2px",
                  padding:       "2px 6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  whiteSpace:    "nowrap",
                  alignSelf:     "center",
                }}>
                  {issue.severity}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}