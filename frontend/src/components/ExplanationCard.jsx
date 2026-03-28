// ExplanationCard — renders DIAGNOSIS / IMPACT / ACTION from the LLM.

import React, { useState } from "react";

function Section({ label, content }) {
  const LABELS = {
    DIAGNOSIS: { color: "#f59e0b", icon: "◈" },
    IMPACT:    { color: "#ef4444", icon: "◈" },
    ACTION:    { color: "#10b981", icon: "◈" },
  };
  const style = LABELS[label] || { color: "#888", icon: "▸" };

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize:      "10px",
        color:         style.color,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        fontWeight:    700,
        marginBottom:  "8px",
        display:       "flex",
        alignItems:    "center",
        gap:           "6px",
      }}>
        <span>{style.icon}</span> {label}
      </div>
      <div style={{
        fontSize:   "13.5px",
        color:      "#cbd5e1",
        lineHeight: 1.6,
        paddingLeft:"14px",
        borderLeft: `3px solid ${style.color}66`,
      }}>
        {content.split("\n").map((line, i) => (
          line.trim() ? <div key={i} style={{ marginBottom: "4px" }}>{line.trim()}</div> : null
        ))}
      </div>
    </div>
  );
}

function parseExplanation(text) {
  // Split full_text into DIAGNOSIS / IMPACT / ACTION sections
  const sections = {};
  let current = null;
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DIAGNOSIS")) { current = "DIAGNOSIS"; sections[current] = []; }
    else if (trimmed.startsWith("IMPACT")) { current = "IMPACT"; sections[current] = []; }
    else if (trimmed.startsWith("ACTION")) { current = "ACTION"; sections[current] = []; }
    else if (current && trimmed) {
      sections[current].push(trimmed);
    }
  }

  return {
    DIAGNOSIS: (sections.DIAGNOSIS || []).join("\n"),
    IMPACT:    (sections.IMPACT    || []).join("\n"),
    ACTION:    (sections.ACTION    || []).join("\n"),
  };
}

export default function ExplanationCard({ explanation, loading }) {
  if (loading) {
    return (
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        padding:    "24px",
        color:      "#10b981",
        fontSize:   "12px",
        display:    "flex",
        gap:        "10px",
        alignItems: "center",
      }}>
        <span style={{ animation: "pulse 1.2s ease-in-out infinite" }}>◈</span>
        Generating explanation...
      </div>
    );
  }

  if (!explanation) {
    return (
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        padding:    "24px",
        color:      "#94a3b8",
        fontSize:   "12px",
        textAlign:  "center",
      }}>
        Run a drift check to generate an explanation.
      </div>
    );
  }

  const { summary, full_text, used_llm, model } = explanation;
  const sections = parseExplanation(full_text || "");

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* Summary headline */}
      <div style={{
        fontSize:     "15px",
        color:        "#f8fafc",
        lineHeight:   1.6,
        fontWeight:   500,
        marginBottom: "24px",
        paddingBottom:"16px",
        borderBottom: "1px solid #1e293b",
      }}>
        {summary}
      </div>

      {/* Sections */}
      {sections.DIAGNOSIS && <Section label="DIAGNOSIS" content={sections.DIAGNOSIS} />}
      {sections.IMPACT    && <Section label="IMPACT"    content={sections.IMPACT}    />}
      {sections.ACTION    && <Section label="ACTION"    content={sections.ACTION}    />}

      {/* Model badge */}
      <div style={{
        marginTop:     "16px",
        paddingTop:    "12px",
        borderTop:     "1px solid #1e293b",
        fontSize:      "11px",
        color:         "#64748b",
        display:       "flex",
        alignItems:    "center",
        gap:           "8px",
      }}>
        <span style={{
          background:   used_llm ? "rgba(16, 185, 129, 0.1)" : "#1e293b",
          border:       `1px solid ${used_llm ? "#10b981" : "#475569"}`,
          borderRadius: "4px",
          padding:      "3px 10px",
          color:        used_llm ? "#10b981" : "#94a3b8",
          fontWeight:   600,
          fontFamily:   "'JetBrains Mono', monospace",
        }}>
          {used_llm ? `claude / ${model}` : "rule-based engine"}
        </span>
        {!used_llm && (
          <span style={{ color: "#64748b", fontSize: "10px" }}>
            set ANTHROPIC_API_KEY for AI analysis
          </span>
        )}
      </div>
    </div>
  );
}