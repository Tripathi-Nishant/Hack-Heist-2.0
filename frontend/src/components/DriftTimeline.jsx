import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";

const FONT = "'Outfit', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

export default function DriftTimeline({ history = [] }) {
  const latestReport = history[0] || {};
  const severity = latestReport.overall_severity || "stable";
  
  const COLORS = {
    critical: "#ef4444",
    warning:  "#f59e0b",
    stable:   "#10b981",
  };
  const activeColor = COLORS[severity] || COLORS.stable;

  if (!history || history.length < 2) {
    return (
      <div style={{
        height: "120px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontSize: "12px",
        background: "#0f172a",
        borderRadius: "6px",
        border: "1px solid #1e293b",
        fontFamily: FONT,
      }}>
        Waiting for more data to generate trend analysis...
      </div>
    );
  }

  // Pre-process history for the chart (limit to last 20)
  const data = [...history].reverse().slice(-30).map((item, idx) => ({
    name: idx,
    count: item.drifted_features?.length || 0,
    severity: item.overall_severity,
    time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div style={{
      background: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: "6px",
      padding: "20px",
      marginBottom: "20px",
    }}>
      <div style={{
        fontSize: "10px",
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontWeight: 600,
        marginBottom: "16px",
        fontFamily: FONT,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span>System Drift Timeline</span>
        <span style={{ 
          color: activeColor,
          animation: severity === "critical" ? "pulse-glow 2s infinite" : "none" 
        }}>
          {severity === "stable" ? "Live Monitoring Active" : `System Health: ${severity.toUpperCase()}`}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={activeColor} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="time" 
            hide={false} 
            tick={{ fill: "#64748b", fontSize: 9, fontFamily: FONT_MONO }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: "#64748b", fontSize: 9, fontFamily: FONT_MONO }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              background: "#020617", 
              border: "1px solid #1e293b", 
              borderRadius: "4px",
              fontSize: "11px",
              fontFamily: FONT
            }}
            itemStyle={{ color: activeColor }}
            labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
            formatter={(value) => [`${value} features`, "Drift Count"]}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke={activeColor} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorCount)" 
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <div style={{ 
        marginTop: "12px", 
        fontSize: "10px", 
        color: "#475569", 
        fontFamily: FONT,
        textAlign: "right"
      }}>
        Metric: Number of features showing statistical drift (PSI {" > "} 0.1)
      </div>
    </div>
  );
}
