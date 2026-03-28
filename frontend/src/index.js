import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Global reset and modern CSS rules
const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Outfit:wght@500;700&display=swap');
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    background: #020617; 
    font-family: 'Outfit', sans-serif;
    color: #f8fafc;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #0f172a; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #475569; }
  
  @keyframes pulse-glow { 
    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 
    50% { box-shadow: 0 0 8px 4px rgba(16, 185, 129, 0.1); } 
  }
  @keyframes critical-pulse {
    0%, 100% { box-shadow: 0 0 15px 2px rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.8); }
    50% { box-shadow: 0 0 5px 1px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }
  }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);