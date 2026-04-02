import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function InvitePage() {
  const { code }    = useParams();
  const { user }    = useAuth();
  const { theme }   = useTheme();
  const navigate    = useNavigate();
  const isDark = theme === "dark";

  const [status,    setStatus]    = useState("loading"); // loading | preview | joining | joined | error | already
  const [workspace, setWorkspace] = useState(null);
  const [error,     setError]     = useState("");

  const P = {
    bg:     isDark ? "#080B2A" : "#F0F0F5",
    card:   isDark ? "#0D1035" : "#ffffff",
    border: isDark ? "#1B3066" : "#c8c8dc",
    text:   isDark ? "#F0F0F5" : "#080B2A",
    muted:  isDark ? "#6B7399" : "#6B7399",
  };

  // Preview workspace info without joining
  useEffect(() => {
    if (!code) return;
    api.get(`/workspaces/invite/${code}`)
      .then(res => { setWorkspace(res.data.data); setStatus("preview"); })
      .catch(err => {
        const msg = err.response?.data?.message || "Урилга хүчингүй байна";
        if (err.response?.status === 409) setStatus("already");
        else { setError(msg); setStatus("error"); }
      });
  }, [code]);

  const handleJoin = async () => {
    if (!user) { navigate(`/login?redirect=/invite/${code}`); return; }
    setStatus("joining");
    try {
      const res = await api.post("/workspaces/join", { inviteCode: code });
      const ws  = res.data.data;
      setStatus("joined");
      // Navigate to workspace after short delay
      setTimeout(async () => {
        try {
          const chRes = await api.get(`/channels/workspace/${ws.id}`);
          const chs   = chRes.data.data || [];
          if (chs.length > 0) navigate(`/chat/${ws.id}/${chs[0].id}`);
          else navigate("/dashboard");
        } catch { navigate("/dashboard"); }
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || "Нэгдэж чадсангүй";
      if (err.response?.status === 409) setStatus("already");
      else { setError(msg); setStatus("error"); }
    }
  };

  const goToDashboard = () => navigate("/dashboard");

  const hue = (workspace?.name?.charCodeAt(0) || 50) % 360;
  const avatarSrc = workspace?.avatar
    ? ((import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace("/api", "") + workspace.avatar)
    : null;

  return (
    <div style={{
      minHeight: "100dvh", background: P.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "system-ui, sans-serif",
    }}>
      {/* Subtle bg glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: isDark
          ? "radial-gradient(ellipse at 50% 40%, rgba(27,48,102,0.35) 0%, transparent 65%)"
          : "radial-gradient(ellipse at 50% 40%, rgba(27,48,102,0.08) 0%, transparent 65%)",
      }} />

      <div style={{
        width: "100%", maxWidth: 420,
        background: P.card, border: `1px solid ${P.border}`,
        borderRadius: 24, overflow: "hidden",
        boxShadow: isDark ? "0 24px 80px rgba(8,11,42,0.7)" : "0 8px 40px rgba(8,11,42,0.12)",
        animation: "fadeUp .3s cubic-bezier(0.22,1,0.36,1) both",
        position: "relative",
      }}>
        {/* Top gradient bar */}
        <div style={{ height: 4, background: "linear-gradient(90deg,#1B3066,#6B7399,#1B3066)" }} />

        <div style={{ padding: 32, textAlign: "center" }}>

          {/* Loading */}
          {status === "loading" && (
            <div style={{ padding: "32px 0" }}>
              <svg style={{ animation: "spin 1s linear infinite", width: 32, height: 32, color: P.muted, margin: "0 auto 16px", display: "block" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity=".2"/>
                <path d="M12 2a10 10 0 0110 10"/>
              </svg>
              <p style={{ color: P.muted, fontSize: 14 }}>Урилга шалгаж байна…</p>
            </div>
          )}

          {/* Preview — show workspace info and join button */}
          {status === "preview" && workspace && (
            <>
              {/* Workspace avatar */}
              <div style={{ marginBottom: 20 }}>
                {avatarSrc
                  ? <img src={avatarSrc} alt="" style={{ width: 80, height: 80, borderRadius: 20, objectFit: "cover", border: `2px solid ${P.border}`, margin: "0 auto", display: "block" }} />
                  : <div style={{ width: 80, height: 80, borderRadius: 20, background: `linear-gradient(135deg,hsl(${hue},45%,25%),hsl(${hue+30},45%,18%))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#F0F0F5", margin: "0 auto", boxShadow: `0 8px 24px hsl(${hue},45%,15%)` }}>
                      {workspace.name?.[0]?.toUpperCase()}
                    </div>
                }
              </div>

              <p style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                Workspace урилга
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: P.text, marginBottom: 8 }}>
                {workspace.name}
              </h1>
              {workspace.description && (
                <p style={{ fontSize: 14, color: P.muted, marginBottom: 24, lineHeight: 1.5 }}>
                  {workspace.description}
                </p>
              )}

              {/* Member count */}
              {workspace.memberCount && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 14px", borderRadius: 20,
                  background: isDark ? "rgba(27,48,102,0.3)" : "rgba(27,48,102,0.07)",
                  border: `1px solid ${P.border}`,
                  marginBottom: 28,
                }}>
                  <span style={{ fontSize: 13, color: P.muted }}>👥 {workspace.memberCount} гишүүн</span>
                </div>
              )}

              {user ? (
                <button onClick={handleJoin} style={{
                  width: "100%", padding: "13px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg,#1B3066,#2a4080)",
                  color: "#F0F0F5", fontSize: 15, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(27,48,102,0.5)", transition: "all .2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(27,48,102,0.55)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(27,48,102,0.5)"; }}>
                  Workspace-д нэгдэх
                </button>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: P.muted, marginBottom: 14 }}>Нэгдэхийн тулд нэвтэрнэ үү</p>
                  <button onClick={() => navigate(`/login?redirect=/invite/${code}`)} style={{
                    width: "100%", padding: "13px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg,#1B3066,#2a4080)",
                    color: "#F0F0F5", fontSize: 15, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(27,48,102,0.5)", transition: "all .2s",
                  }}>
                    Нэвтрэх
                  </button>
                </>
              )}
            </>
          )}

          {/* Joining */}
          {status === "joining" && (
            <div style={{ padding: "32px 0" }}>
              <svg style={{ animation: "spin 1s linear infinite", width: 32, height: 32, color: "#6B7399", margin: "0 auto 16px", display: "block" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity=".2"/>
                <path d="M12 2a10 10 0 0110 10"/>
              </svg>
              <p style={{ color: P.muted, fontSize: 14 }}>Нэгдэж байна…</p>
            </div>
          )}

          {/* Joined */}
          {status === "joined" && (
            <div style={{ padding: "24px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: P.text, marginBottom: 8 }}>Амжилттай нэгдлээ!</h2>
              <p style={{ fontSize: 14, color: P.muted }}>Workspace руу шилжиж байна…</p>
            </div>
          )}

          {/* Already member */}
          {status === "already" && (
            <div style={{ padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: P.text, marginBottom: 8 }}>Та аль хэдийн гишүүн байна</h2>
              <p style={{ fontSize: 14, color: P.muted, marginBottom: 24 }}>Энэ workspace-д нэгдсэн байна</p>
              <button onClick={goToDashboard} style={{
                width: "100%", padding: "11px", borderRadius: 12, border: `1px solid ${P.border}`,
                background: "transparent", color: P.text, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(27,48,102,0.2)" : "rgba(27,48,102,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                Dashboard руу очих →
              </button>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div style={{ padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: P.text, marginBottom: 8 }}>Урилга хүчингүй</h2>
              <p style={{ fontSize: 14, color: "#f87171", marginBottom: 24 }}>{error}</p>
              <button onClick={goToDashboard} style={{
                width: "100%", padding: "11px", borderRadius: 12, border: `1px solid ${P.border}`,
                background: "transparent", color: P.text, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
                Нүүр хуудас руу очих →
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
