import { useState } from "react";
import api from "../../api/axios.js";
import { useTheme } from "../../context/ThemeContext.jsx";

export default function CreateWorkspaceModal({ onClose, onCreated }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const P = {
    bg:     isDark ? "#0D1035" : "#ffffff",
    bg2:    isDark ? "#111540" : "#f4f4fb",
    border: isDark ? "#1B3066" : "#c8c8dc",
    bd2:    isDark ? "#2a4080" : "#b0b0cc",
    text:   isDark ? "#F0F0F5" : "#080B2A",
    muted:  isDark ? "#6B7399" : "#6B7399",
    shadow: isDark ? "0 24px 60px rgba(8,11,42,0.8)" : "0 8px 40px rgba(8,11,42,0.15)",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Workspace нэр шаардлагатай");
    setError(""); setSubmitting(true);
    try {
      const res = await api.post("/workspaces", form);
      onCreated?.(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Үүсгэж чадсангүй");
    } finally { setSubmitting(false); }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: `1px solid ${P.bd2}`, background: isDark ? "#080B2A" : "#F0F0F5",
    color: P.text, fontSize: 13, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color .15s, box-shadow .15s",
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: isDark ? "rgba(8,11,42,0.75)" : "rgba(8,11,42,0.4)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, animation: "fadeIn .15s ease both",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 400,
        background: P.bg, border: `1px solid ${P.border}`,
        borderRadius: 20, overflow: "hidden",
        boxShadow: P.shadow,
        animation: "fadeUp .25s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${P.border}` }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: P.text, margin: 0 }}>Workspace үүсгэх</h2>
            <p style={{ fontSize: 12, color: P.muted, margin: 0, marginTop: 2 }}>Шинэ орон зай нэмэх</p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: "50%",
            background: isDark ? "rgba(107,115,153,0.15)" : "rgba(27,48,102,0.06)",
            border: "none", cursor: "pointer", color: P.muted,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(107,115,153,0.15)" : "rgba(27,48,102,0.06)"; e.currentTarget.style.color = P.muted; }}>
            <i className="fa-solid fa-xmark" style={{fontSize:14}}></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 12 }}>
              {error}
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: P.muted, marginBottom: 6 }}>
              Нэр *
            </label>
            <input
              style={inputStyle}
              placeholder="Workspace нэр"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onFocus={e => { e.target.style.borderColor = "#6B7399"; e.target.style.boxShadow = "0 0 0 3px rgba(107,115,153,0.15)"; }}
              onBlur={e => { e.target.style.borderColor = P.bd2; e.target.style.boxShadow = "none"; }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: P.muted, marginBottom: 6 }}>
              Тайлбар
            </label>
            <input
              style={inputStyle}
              placeholder="Заавал биш"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onFocus={e => { e.target.style.borderColor = "#6B7399"; e.target.style.boxShadow = "0 0 0 3px rgba(107,115,153,0.15)"; }}
              onBlur={e => { e.target.style.borderColor = P.bd2; e.target.style.boxShadow = "none"; }}
            />
          </div>
          <button type="submit" disabled={submitting} style={{
            padding: "11px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#1B3066,#2a4080)",
            color: "#F0F0F5", fontSize: 13, fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1, transition: "all .15s",
            boxShadow: "0 4px 14px rgba(27,48,102,0.4)",
          }}
            onMouseEnter={e => { if (!submitting) { e.currentTarget.style.background = "linear-gradient(135deg,#2a4080,#6B7399)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(107,115,153,0.35)"; }}}
            onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg,#1B3066,#2a4080)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(27,48,102,0.4)"; }}>
            {submitting ? "Үүсгэж байна…" : "Үүсгэх →"}
          </button>
        </form>
      </div>
    </div>
  );
}
