import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext.jsx";
import { useCall } from "../../context/CallContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useRingtone } from "../../hooks/useRingtone.js";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace("/api","");

export default function CallToastManager() {
  const { socket }                           = useSocket();
  const { incomingCall, clearIncomingCall }  = useCall();
  const { theme }                            = useTheme();
  const navigate                             = useNavigate();
  const isDark = theme === "dark";

  const [phase, setPhase] = useState("enter");
  const [pulse, setPulse] = useState(true);
  const pulseRef = useRef(null);
  const autoRef  = useRef(null);

  useRingtone(!!incomingCall);

  useEffect(() => {
    if (!incomingCall) { setPhase("enter"); return; }
    const t = setTimeout(() => setPhase("idle"), 30);
    pulseRef.current = setInterval(() => setPulse(p => !p), 900);
    autoRef.current  = setTimeout(decline, 30000);
    return () => { clearTimeout(t); clearInterval(pulseRef.current); clearTimeout(autoRef.current); };
  }, [incomingCall]);

  function answer() {
    if (!incomingCall) return;
    clearTimeout(autoRef.current);
    clearInterval(pulseRef.current);

    // Step 1: persist to localStorage so CallPage can read even if context clears
    try { localStorage.setItem("aura_incoming_call", JSON.stringify(incomingCall)); } catch {}

    // Step 2: animate out
    setPhase("leave");

    // Step 3: navigate → CallPage reads localStorage on mount
    const target = `/call/${incomingCall.fromUserId}?mode=answer&video=${incomingCall.withVideo?"1":"0"}`;
    setTimeout(() => {
      navigate(target);
      // Clear context after navigation (CallPage already has data from localStorage)
      setTimeout(clearIncomingCall, 800);
    }, 250);
  }

  function decline() {
    if (!incomingCall) return;
    socket?.emit("dm_call_end", { toUserId: incomingCall.fromUserId });
    clearTimeout(autoRef.current);
    clearInterval(pulseRef.current);
    setPhase("leave");
    setTimeout(clearIncomingCall, 300);
  }

  if (!incomingCall) return null;

  const avatarSrc = incomingCall.fromAvatar
    ? (incomingCall.fromAvatar.startsWith("http") ? incomingCall.fromAvatar : API_BASE + incomingCall.fromAvatar)
    : null;
  const hue  = (incomingCall.fromUsername?.charCodeAt(0) || 0) % 360;
  const bg   = isDark ? "#0D1035" : "#ffffff";
  const text = isDark ? "#F0F0F5" : "#080B2A";

  return (
    <div style={{
      position:"fixed", bottom:20, right:20, zIndex:9998, width:300,
      background:bg,
      border:`1px solid rgba(34,197,94,${isDark?.35:.25})`,
      borderRadius:18, overflow:"hidden",
      boxShadow:isDark?"0 20px 60px rgba(8,11,42,.8)":"0 8px 40px rgba(8,11,42,.15)",
      transform:phase==="idle"?"translateY(0) scale(1)":phase==="enter"?"translateY(24px) scale(.94)":"translateY(12px) scale(.94)",
      opacity:phase==="idle"?1:0,
      transition:"transform .32s cubic-bezier(0.22,1,0.36,1), opacity .32s ease",
    }}>
      <div style={{ height:3, background:"linear-gradient(90deg,#16a34a,#22c55e,#16a34a)", opacity:pulse?1:.4, transition:"opacity .4s" }}/>
      <div style={{ padding:"14px 16px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <div style={{ position:"relative", flexShrink:0 }}>
            {avatarSrc
              ? <img src={avatarSrc} alt="" style={{ width:46, height:46, borderRadius:"50%", objectFit:"cover" }}/>
              : <div style={{ width:46, height:46, borderRadius:"50%", background:`linear-gradient(135deg,hsl(${hue},50%,28%),hsl(${hue+30},50%,18%))`, display:"flex", alignItems:"center", justifyContent:"center", color:"#F0F0F5", fontSize:18, fontWeight:700 }}>
                  {incomingCall.fromUsername?.[0]?.toUpperCase()}
                </div>
            }
            <span style={{ position:"absolute", inset:-3, borderRadius:"50%", border:"2px solid #22c55e", opacity:pulse?.7:.15, transition:"opacity .5s" }}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:11, color:"#22c55e", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", margin:"0 0 2px" }}>
              {incomingCall.withVideo?"Видео дуудлага":"Дуут дуудлага"}
            </p>
            <p style={{ fontSize:15, fontWeight:700, color:text, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {incomingCall.fromUsername}
            </p>
          </div>
          <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", display:"flex", alignItems:"center", justifyContent:"center", transform:pulse?"rotate(15deg)":"rotate(-15deg)", transition:"transform .5s" }}>
            {incomingCall.withVideo?<i className="fa-solid fa-video" style={{fontSize:18}}></i>:<i className="fa-solid fa-phone" style={{fontSize:18}}></i>}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={decline} style={{ flex:1, padding:"9px 0", borderRadius:10, cursor:"pointer", background:isDark?"rgba(239,68,68,.1)":"rgba(239,68,68,.07)", border:"1px solid rgba(239,68,68,.28)", color:"#f87171", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="#dc2626";e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="#dc2626";}}
            onMouseLeave={e=>{e.currentTarget.style.background=isDark?"rgba(239,68,68,.1)":"rgba(239,68,68,.07)";e.currentTarget.style.color="#f87171";e.currentTarget.style.borderColor="rgba(239,68,68,.28)";}}>
            <i className="fa-solid fa-phone-slash" style={{fontSize:13}}></i> Татгалзах
          </button>
          <button onClick={answer} style={{ flex:1, padding:"9px 0", borderRadius:10, cursor:"pointer", background:"linear-gradient(135deg,#16a34a,#15803d)", border:"none", color:"#fff", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxShadow:"0 4px 14px rgba(22,163,74,.4)", transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="#22c55e";}}
            onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,#16a34a,#15803d)";}}>
            <i className="fa-solid fa-phone" style={{fontSize:13}}></i> Хүлээн авах
          </button>
        </div>
      </div>
    </div>
  );
}
