import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "../components/ui/Logo.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useCursor } from "../hooks/useCursor.js";
import api from "../api/axios.js";

const LoginPage = () => {
  const { loginWithToken } = useAuth();
  const { theme, toggle }  = useTheme();
  const navigate = useNavigate();
  useCursor(theme);

  useEffect(() => {
    document.body.classList.add("cursor-none");
    return () => document.body.classList.remove("cursor-none");
  }, []);

  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  const P = {
    bg:       isDark ? "#04061a" : "#F0F0F5",
    surface:  isDark ? "#080b28" : "#ffffff",
    surface2: isDark ? "#0c0f32" : "#f0f0f8",
    border:   isDark ? "#151d4a" : "#c8c8dc",
    border2:  isDark ? "#1e2d6a" : "#b0b0cc",
    text:     isDark ? "#F0F0F5" : "#04061a",
    text2:    isDark ? "#b8bdd8" : "#151d4a",
    muted:    isDark ? "#6B7399" : "#6B7399",
  };

  // Hover state: slate-blue glow #6B7399
  const hoverBg   = isDark ? "rgba(107,115,153,0.18)" : "rgba(107,115,153,0.1)";
  const hoverBd   = "#6B7399";
  const hoverText = isDark ? "#F0F0F5" : "#04061a";

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError(""); setLoading(true);
      const res = await api.post("/auth/google", { credential: credentialResponse.credential });
      const { token, user } = res.data.data;
      loginWithToken(token, user);
      const redir = new URLSearchParams(window.location.search).get('redirect');
      navigate(redir || "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Google нэвтрэлт амжилтгүй");
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.includes("@")) return setError("Имэйл буруу байна.");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email });
      const { token, user } = res.data.data;
      loginWithToken(token, user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Нэвтрэх амжилтгүй.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page-wrapper" style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center",
      background: P.bg, padding:16, position:"relative", transition:"background .25s ease" }}>

      {/* Theme toggle */}
      <button onClick={toggle} style={{
        position:"fixed", top:16, right:16, zIndex:50,
        display:"flex", alignItems:"center", gap:8,
        padding:"8px 14px", borderRadius:999,
        background: P.surface, border:`1px solid ${P.border2}`,
        color: P.muted, fontSize:12, fontWeight:500, cursor:"none",
        transition:"all .15s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=hoverBd;e.currentTarget.style.color=hoverText;e.currentTarget.style.background=hoverBg;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=P.border2;e.currentTarget.style.color=P.muted;e.currentTarget.style.background=P.surface;}}
      >
        {isDark
          ? <><i className="fa-solid fa-sun" style={{fontSize:12}}></i> Light</>
          : <><i className="fa-solid fa-moon" style={{fontSize:12}}></i> Dark</>
        }
      </button>

      {/* Card */}
      <div className="login-card" style={{
        width:"100%", maxWidth:880, display:"flex",
        borderRadius:18, overflow:"hidden",
        boxShadow: isDark
          ? "0 32px 80px rgba(8,11,42,0.8), 0 0 0 1px rgba(27,48,102,0.5)"
          : "0 8px 48px rgba(8,11,42,0.12), 0 1px 4px rgba(8,11,42,0.06)",
        border:`1px solid ${P.border}`,
        animation:"fadeUp .4s cubic-bezier(0.22,1,0.36,1) both",
      }}>

        {/* Left — branding */}
        <div className="login-card-left" style={{
          flex:1, display:"flex", flexDirection:"column",
          justifyContent:"space-between",
          padding:48, position:"relative", overflow:"hidden",
          background:"linear-gradient(145deg,#080B2A 0%,#0D1240 45%,#0a1a50 100%)",
        }}>
          {/* Bg glow */}
          <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
            <div style={{position:"absolute",top:"10%",left:"15%",width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle,rgba(27,48,102,0.55) 0%,transparent 70%)"}}/>
            <div style={{position:"absolute",bottom:"15%",right:"5%",width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(107,115,153,0.18) 0%,transparent 70%)"}}/>
          </div>

          {/* Center: icon + big AURA */}
          <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:10,flex:1,justifyContent:"center"}}>
            <div style={{
              width:110, height:110, borderRadius:28,
              background:"linear-gradient(145deg,#1e3d8a,#1a3578)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 8px 32px rgba(10,20,80,0.6), inset 0 1px 0 rgba(100,160,255,0.15)",
            }}>
              <Logo size={74} showText={false} />
            </div>
            <div style={{textAlign:"center",lineHeight:1}}>
              <div style={{fontSize:40,fontWeight:900,color:"#ffffff",letterSpacing:"0.18em",fontFamily:"system-ui,-apple-system,sans-serif"}}>AURA SYNC</div>
            </div>
          </div>

          {/* Bottom: chat animation */}
          <div style={{position:"relative",zIndex:1,animation:"fadeUp .4s ease .5s both"}}>
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:24,marginBottom:16,height:120}}>
              {/* User A */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{position:"relative"}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#1B3066,#2a4080)",color:"#F0F0F5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>A</div>
                  <span style={{position:"absolute",bottom:-2,right:-2,width:12,height:12,borderRadius:"50%",background:"#22c55e",border:"2px solid #080B2A"}}/>
                </div>
                <div style={{width:56,height:64,borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(180deg,rgba(27,48,102,0.4),rgba(27,48,102,0.05))"}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(240,240,245,0.4)" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
              </div>
              {/* Messages */}
              <div style={{display:"flex",flexDirection:"column",gap:8,flex:1,maxWidth:140}}>
                <div style={{alignSelf:"flex-start",padding:"6px 12px",borderRadius:"12px 12px 12px 2px",fontSize:12,background:"rgba(27,48,102,0.6)",color:"#F0F0F5",border:"1px solid rgba(107,115,153,0.3)",animation:"fadeUp .4s ease .7s both"}}>Сайн байна уу! 👋</div>
                <div style={{alignSelf:"flex-end",padding:"6px 12px",borderRadius:"12px 12px 2px 12px",fontSize:12,background:"rgba(107,115,153,0.25)",color:"#F0F0F5",border:"1px solid rgba(107,115,153,0.2)",animation:"fadeUp .4s ease .9s both"}}>Сайн! Та яаж байна? 😊</div>
                <div style={{display:"flex",gap:4,paddingLeft:8,animation:"fadeUp .4s ease 1.1s both"}}>
                  {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:"#6B7399",animation:`bounce 1s ${i*0.15}s infinite`}}/>)}
                </div>
              </div>
              {/* User B */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{position:"relative"}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#6B7399,#1B3066)",color:"#F0F0F5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>B</div>
                  <span style={{position:"absolute",bottom:-2,right:-2,width:12,height:12,borderRadius:"50%",background:"#22c55e",border:"2px solid #080B2A"}}/>
                </div>
                <div style={{width:56,height:64,borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(180deg,rgba(107,115,153,0.3),rgba(107,115,153,0.05))"}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(240,240,245,0.4)" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
              </div>
            </div>
            <p style={{textAlign:"center",fontSize:12,color:"rgba(107,115,153,0.5)"}}>
              AURA-SYNC — Хаана ч, хэзээ ч холбогдоорой
            </p>
          </div>
        </div>

        {/* Right — form */}
        <div className="login-form-panel" style={{
          width:400, flexShrink:0,
          background: isDark ? "#080b28" : "#fff",
          display:"flex", alignItems:"center", padding:"40px 40px",
          borderLeft:`1px solid ${P.border}`,
        }}>
          <div style={{width:"100%"}}>

            {/* Mobile-only logo */}
            <div className="login-mobile-logo" style={{display:"none", flexDirection:"column", alignItems:"center", marginBottom:36}}>
              <div style={{
                width:72, height:72, borderRadius:20,
                background:"linear-gradient(145deg,#1e3d8a,#1a3578)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 8px 24px rgba(10,20,80,0.5)",
                marginBottom:12,
              }}>
                <Logo size={48} showText={false} />
              </div>
              <div style={{fontSize:22,fontWeight:900,color:isDark?"#fff":P.text,letterSpacing:"0.12em"}}>AURA SYNC</div>
              <div style={{fontSize:12,color:P.muted,marginTop:4}}>Хаана ч, хэзээ ч холбогдоорой</div>
            </div>

            <div style={{marginBottom:28}}>
              <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:700,letterSpacing:"-0.02em",color:P.text,marginBottom:4}}>
                Тавтай морил 👋
              </h2>
              <p style={{fontSize:13,color:P.muted}}>Workspace руугаа нэвтрэх</p>
            </div>

            {/* Google Login button */}
            {loading ? (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                padding:"12px 16px",borderRadius:12,marginBottom:20,
                border:`1px solid ${P.border2}`,background:isDark?"#0c0f32":"#f5f5f5",
                color:P.muted,fontSize:14,fontWeight:600}}>
                <svg style={{animation:"spinSlow 1.2s linear infinite"}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10"/>
                </svg>
                Нэвтэрч байна…
              </div>
            ) : (
              <div style={{marginBottom:20}}>
                <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={() => setError("Google нэвтрэлт амжилтгүй")} isDark={isDark} />
              </div>
            )}



            
          </div>
        </div>
      </div>

      <canvas id="particle-canvas" style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",pointerEvents:"none",zIndex:99999,display:"block"}}/>
    </div>
  );
};


// ── Custom Google Auth Button ─────────────────────────────────────────────
const initDone = { current: false };  // module-level flag, not per-component

function GoogleAuthButton({ onSuccess, onError, isDark }) {
  const divRef    = useRef(null);
  const clientId  = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const render = () => {
    if (!window.google?.accounts?.id || !divRef.current || !clientId) return;
    if (!initDone.current) {
      initDone.current = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: onSuccess,
        ux_mode: "popup",
      });
    }
    try {
      window.google.accounts.id.renderButton(divRef.current, {
        type: "standard",
        theme: isDark ? "filled_black" : "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 320,
      });
    } catch (e) { console.warn("[Google]", e.message); }
  };

  useEffect(() => {
    if (window.google?.accounts?.id) {
      render();
      return;
    }
    // Load script once
    if (!document.getElementById("gsi-script")) {
      const s = document.createElement("script");
      s.id    = "gsi-script";
      s.src   = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      // Script tag exists but google not ready yet
      const check = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(check); render(); }
      }, 100);
      return () => clearInterval(check);
    }
  }, [isDark]);

  return <div ref={divRef} style={{ minHeight: 44, display: "flex", justifyContent: "center" }} />;
}

export default LoginPage;
