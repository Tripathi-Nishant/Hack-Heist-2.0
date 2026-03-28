// FeatureHeatmap — grid of feature health cells.
// Each cell is colour-coded by severity and shows PSI / p-value.

import React, { useState } from "react";

const SEV_COLOR = {
  critical:     { bg: "rgba(239, 68, 68, 0.1)", border: "#ef4444", text: "#ef4444", dot: "#ef4444" },
  warning:      { bg: "rgba(245, 158, 11, 0.1)", border: "#f59e0b", text: "#f59e0b", dot: "#f59e0b" },
  stable:       { bg: "rgba(16, 185, 129, 0.1)", border: "#10b981", text: "#10b981", dot: "#10b981" },
  type_mismatch:{ bg: "rgba(139, 92, 246, 0.1)", border: "#8b5cf6", text: "#a78bfa", dot: "#8b5cf6" },
};

function metric(data) {
  if (data.type === "numerical")  return `PSI ${data.psi?.toFixed(3) ?? "—"}`;
  if (data.type === "categorical") return `p=${data.chi2_test?.p_value?.toFixed(3) ?? "—"}`;
  return "type mismatch";
}

function meanDelta(data) {
  if (data.type !== "numerical") return null;
  const { ref_mean, cur_mean } = data;
  if (ref_mean == null || cur_mean == null || ref_mean === 0) return null;
  const pct = ((cur_mean - ref_mean) / Math.abs(ref_mean)) * 100;
  return pct;
}

export default function FeatureHeatmap({ features = {}, onFeatureClick }) {
  const [hovered, setHovered] = useState(null);

  const entries = Object.entries(features);
  if (!entries.length) return null;

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "8px",
      }}>
        {entries.map(([name, data]) => {
          const sev    = data.severity || "stable";
          const colors = SEV_COLOR[sev] || SEV_COLOR.stable;
          const delta  = meanDelta(data);
          const isHov  = hovered === name;

          return (
            <div
              key={name}
              onClick={() => onFeatureClick?.(name, data)}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background:   isHov ? colors.border + "1A" : colors.bg,
                border:       `1px solid ${isHov ? colors.border : colors.border + "40"}`,
                borderRadius: "6px",
                padding:      "12px 14px",
                cursor:       "pointer",
                transition:   "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                position:     "relative",
                overflow:     "hidden",
              }}
            >
              {/* severity dot */}
              <div style={{
                position:     "absolute",
                top: 10, right: 10,
                width: 7, height: 7,
                borderRadius: "50%",
                background:   colors.dot,
                boxShadow:    `0 0 10px ${colors.dot}`,
              }} />

              {/* feature name */}
              <div style={{
                fontSize: "11px",
                color:    colors.text,
                fontWeight: 600,
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                paddingRight: "16px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {name}
              </div>

              {/* type badge */}
              <div style={{
                fontSize: "9px",
                color:    colors.text + "88",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                {data.type}
              </div>

              {/* metric */}
              <div style={{
                fontSize: "14px",
                color:    colors.text,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {metric(data)}
              </div>

              {/* mean delta for numerical */}
              {delta != null && (
                <div style={{
                  fontSize:  "11px",
                  color:     Math.abs(delta) > 20 ? colors.text : "#94a3b8",
                  marginTop: "4px",
                }}>
                  mean {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                </div>
              )}

              {/* severity label */}
              <div style={{
                fontSize:      "9px",
                color:         colors.text,
                marginTop:     "8px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight:    700,
              }}>
                {sev}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}