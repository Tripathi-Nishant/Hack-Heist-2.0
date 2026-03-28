// DistributionChart — overlays reference and serving distributions.
// Shows visually where the shift happened.

import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function buildHistogramData(refMean, refStd, curMean, curStd, bins = 30) {
  // Synthesise approximate normal distributions from mean/std
  // for visual comparison — real data would come from the API
  if (refMean == null || refStd == null) return [];

  const lo = Math.min(refMean - 3 * refStd, curMean - 3 * (curStd || refStd));
  const hi = Math.max(refMean + 3 * refStd, curMean + 3 * (curStd || refStd));
  const step = (hi - lo) / bins;

  function gaussian(x, mean, std) {
    return Math.exp(-0.5 * Math.pow((x - mean) / std, 2)) / (std * Math.sqrt(2 * Math.PI));
  }

  return Array.from({ length: bins }, (_, i) => {
    const x = lo + i * step + step / 2;
    return {
      x:        +x.toFixed(2),
      training: +gaussian(x, refMean, refStd).toFixed(5),
      serving:  +gaussian(x, curMean, curStd || refStd).toFixed(5),
    };
  });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f172a",
      border:     "1px solid #1e293b",
      borderRadius: "6px",
      padding:    "10px 14px",
      fontFamily: "'Outfit', sans-serif",
      fontSize:   "11px",
      color:      "#f8fafc",
      boxShadow:  "0 4px 12px rgba(0,0,0,0.3)",
    }}>
      <div style={{ color: "#ccc", marginBottom: 4 }}>x = {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey}: {p.value?.toFixed(5)}
        </div>
      ))}
    </div>
  );
};

export default function DistributionChart({ featureName, featureData }) {
  if (!featureData || featureData.type !== "numerical") {
    return (
      <div style={{
        padding: "32px",
        textAlign: "center",
        color: "#64748b",
        fontFamily: "'Outfit', sans-serif",
        fontSize: "12px",
      }}>
        Distribution chart available for numerical features only.
      </div>
    );
  }

  const { ref_mean, ref_std, cur_mean, cur_std } = featureData;
  const data = buildHistogramData(ref_mean, ref_std, cur_mean, cur_std);

  return (
    <div>
      <div style={{
        fontFamily:    "'Outfit', sans-serif",
        fontSize:      "11px",
        color:         "#94a3b8",
        marginBottom:  "16px",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontWeight:    600,
      }}>
        {featureName} — distribution overlay
      </div>

      <div style={{
        display: "flex",
        gap: "24px",
        marginBottom: "12px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
      }}>
        <div style={{ color: "#10b981", fontWeight: 600 }}>
          TRAIN μ={ref_mean?.toFixed(2)} σ={ref_std?.toFixed(2)}
        </div>
        <div style={{ color: "#ef4444", fontWeight: 600 }}>
          SERVE μ={cur_mean?.toFixed(2)} σ={cur_std?.toFixed(2)}
        </div>
        {ref_mean && cur_mean && (
          <div style={{ color: "#888" }}>
            Δμ = {((cur_mean - ref_mean) / Math.abs(ref_mean) * 100).toFixed(1)}%
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trainGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="serveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "#334155" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="training"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#trainGrad)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="serving"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#serveGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}